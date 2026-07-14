import { useCallback } from 'react';

export interface EnrichedWord {
  word: string;
  chinese: string;
  definition: string;
  example: string;
  manual?: boolean; // 是否手动录入（联网获取时不覆盖已填字段）
}

interface Cache {
  [word: string]: EnrichedWord;
}

const STORAGE_KEY = 'spellgame_enriched';

function loadCache(): Cache {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveCache(cache: Cache) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
}

// 联网获取单个单词的释义（中文 + 英文释义 + 例句）
export async function fetchWord(word: string): Promise<EnrichedWord> {
  const w = word.toLowerCase();
  const result: EnrichedWord = { word: w, chinese: '', definition: '', example: '' };

  // 1. Dictionary API（英文释义 + 例句）
  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
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

  // 2. MyMemory 翻译（中文释义）
  try {
    const resp = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(w)}&langpair=en|zh`);
    if (resp.ok) {
      const data = await resp.json();
      result.chinese = data?.responseData?.translatedText || '';
    }
  } catch {}

  return result;
}

// 仅用 src 填补 target 中为空(或false)的字段，保留手动录入内容
function mergeFill(target: EnrichedWord, src: EnrichedWord): EnrichedWord {
  return {
    word: target.word,
    chinese: target.chinese || src.chinese,
    definition: target.definition || src.definition,
    example: target.example || src.example,
    manual: target.manual || src.manual,
  };
}

export function useEnrich() {
  // 批量联网获取：仅填补空缺字段，不覆盖已有内容
  const enrichWords = useCallback(
    async (words: string[], onProgress?: (done: number, total: number) => void): Promise<Cache> => {
      const updated = loadCache();

      for (let i = 0; i < words.length; i++) {
        const w = words[i].toLowerCase();
        const existing = updated[w];
        const fetched = await fetchWord(w);
        updated[w] = existing ? mergeFill(existing, fetched) : { ...fetched, manual: false };

        saveCache(updated); // 每完成一个就存一次，防止中断丢失
        onProgress?.(i + 1, words.length);
        await new Promise(r => setTimeout(r, 300)); // 避免 API rate limit
      }

      return updated;
    },
    []
  );

  // 手动保存单个单词的释义（离线可用，标记为 manual）
  const saveManual = useCallback((word: string, fields: Partial<EnrichedWord>) => {
    const w = word.toLowerCase();
    const current = loadCache();
    const merged: EnrichedWord = {
      word: w,
      chinese: fields.chinese ?? current[w]?.chinese ?? '',
      definition: fields.definition ?? current[w]?.definition ?? '',
      example: fields.example ?? current[w]?.example ?? '',
      manual: true,
    };
    current[w] = merged;
    saveCache(current);
  }, []);

  // 实时读取，保证多实例（释义面板 / 游戏内展示）数据一致
  const getEnriched = useCallback((word: string): EnrichedWord | null => {
    const w = word.toLowerCase();
    return loadCache()[w] || null;
  }, []);

  const exportJson = useCallback((words: string[]): string => {
    const all = loadCache();
    const enrichedList = words.map(word => {
      const w = word.toLowerCase();
      return all[w] || { word: w, chinese: '', definition: '', example: '' };
    });
    return JSON.stringify(enrichedList, null, 2);
  }, []);

  return { enrichWords, fetchWord, saveManual, getEnriched, exportJson };
}
