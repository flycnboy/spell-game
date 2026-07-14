import { useState, useCallback, useEffect } from 'react';

interface HistoryEntry {
  date: string;
  word: string;
  mode: string;
  correct: boolean;
}

interface StoredStats {
  wrongWords: string[];
  history: HistoryEntry[];
}

function load(): StoredStats {
  try {
    const raw = localStorage.getItem('spellgame_stats');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { wrongWords: [], history: [] };
}

function save(data: StoredStats) {
  localStorage.setItem('spellgame_stats', JSON.stringify(data));
}

export function useStats() {
  const [data, setData] = useState<StoredStats>(load);

  useEffect(() => { save(data); }, [data]);

  const recordResult = useCallback((word: string, mode: string, correct: boolean) => {
    setData(prev => {
      const entry: HistoryEntry = { date: new Date().toISOString().slice(0, 10), word, mode, correct };
      let wrongWords = prev.wrongWords;
      if (correct) {
        wrongWords = wrongWords.filter(w => w !== word);
      } else {
        if (!wrongWords.includes(word)) wrongWords = [...wrongWords, word];
      }
      return { wrongWords, history: [...prev.history, entry] };
    });
  }, []);

  const getWrongWords = useCallback((): string[] => data.wrongWords, [data.wrongWords]);

  const getStats = useCallback(() => {
    const total = data.history.length;
    const correct = data.history.filter(h => h.correct).length;
    const today = data.history.filter(h => h.date === new Date().toISOString().slice(0, 10));
    return {
      total, correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      wrongWords: data.wrongWords,
      todayTotal: today.length,
      todayCorrect: today.filter(t => t.correct).length,
    };
  }, [data]);

  const reset = useCallback(() => {
    setData({ wrongWords: [], history: [] });
  }, []);

  return { recordResult, getWrongWords, getStats, reset };
}
