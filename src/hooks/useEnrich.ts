import { useState, useCallback } from 'react';

export interface EnrichedWord {
  word: string;
  chinese: string;
  definition: string;
  example: string;
}

interface Cache {
  [word: string]: EnrichedWord;
}

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem('spellgame_enriched');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveCache(cache: Cache) {
  localStorage.setItem('spellgame_enriched', JSON.stringify(cache));
}

async function fetchOne(word: string): Promise<EnrichedWord> {
  const result: EnrichedWord = { word, chinese: '', definition: '', example: '' };

  // 1. Dictionary API
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    if (resp.ok) {
      const data = await resp.json();
      const entry = data?.[0];
      if (entry) {
        const meaning = entry.meanings?.[0];
        if (meaning) {
          const def = meaning.definitions?.[0];
          if (def) {
            result.definition = def.definition || '';
            result.example = (def.example || '').replace(/(^")|("$)/g, '');
          }
        }
      }
    }
  } catch {}

  // 2. MyMemory Translation
  try {
    const resp = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh`);
    if (resp.ok) {
      const data = await resp.json();
      result.chinese = data?.responseData?.translatedText || '';
    }
  } catch {}

  return result;
}

export function useEnrich() {
  const [cache, setCache] = useState<Cache>(loadCache);

  const enrichWords = useCallback(async (
    words: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<Cache> => {
    const updated = { ...loadCache() };
    let changed = false;

    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      if (updated[w]) continue; // 已缓存跳过

      const enriched = await fetchOne(w);
      updated[w] = enriched;
      changed = true;

      // 每完成一个就存一次，防止中断丢失
      saveCache(updated);

      onProgress?.(i + 1, words.length);

      // 稍微延迟避免 API rate limit
      await new Promise(r => setTimeout(r, 300));
    }

    if (changed) {
      setCache({ ...updated });
    }
    return updated;
  }, []);

  const getEnriched = useCallback((word: string): EnrichedWord | null => {
    const w = word.toLowerCase();
    return cache[w] || null;
  }, [cache]);

  const exportJson = useCallback((words: string[]): string => {
    const all = loadCache();
    const enrichedList = words.map(word => {
      const w = word.toLowerCase();
      return all[w] || { word: w, chinese: '', definition: '', example: '' };
    });
    return JSON.stringify(enrichedList, null, 2);
  }, []);

  return { enrichWords, getEnriched, exportJson };
}
