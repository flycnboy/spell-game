import { useState, useCallback, useEffect } from 'react';
import { reviewInterval } from '../lib/review';

interface HistoryEntry {
  date: string;
  word: string;
  mode: string;
  correct: boolean;
}

interface StoredStats {
  wrongWords: string[];
  history: HistoryEntry[];
  errorCounts: Record<string, number>; // 每个单词累计错误次数（答对衰减）
  reviewSchedule: Record<string, number>; // 每个单词的下次复习日（day 序号）
}

function load(): StoredStats {
  try {
    const raw = localStorage.getItem('spellgame_stats');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        wrongWords: parsed.wrongWords || [],
        history: parsed.history || [],
        errorCounts: parsed.errorCounts || {},
        reviewSchedule: parsed.reviewSchedule || {},
      };
    }
  } catch {}
  return { wrongWords: [], history: [], errorCounts: {}, reviewSchedule: {} };
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
      const w = word.toLowerCase();
      const errorCounts = { ...prev.errorCounts };
      if (correct) {
        // 答对则错误次数衰减，强化记忆
        errorCounts[w] = Math.max(0, (errorCounts[w] || 0) - 1);
      } else {
        errorCounts[w] = (errorCounts[w] || 0) + 1;
      }
      let wrongWords = prev.wrongWords;
      if (correct) {
        wrongWords = wrongWords.filter(x => x !== word);
      } else {
        if (!wrongWords.includes(word)) wrongWords = [...wrongWords, word];
      }
      return { wrongWords, history: [...prev.history, entry], errorCounts, reviewSchedule: prev.reviewSchedule };
    });
  }, []);

  const getWrongWords = useCallback((): string[] => data.wrongWords, [data.wrongWords]);

  const getErrorCounts = useCallback((): Record<string, number> => data.errorCounts, [data.errorCounts]);

  const getReviewSchedule = useCallback((): Record<string, number> => data.reviewSchedule, [data.reviewSchedule]);

  // 复习完成后排程下次复习日（按当前错误次数加权）
  const markReviewed = useCallback((words: string[], day: number) => {
    setData(prev => {
      const reviewSchedule = { ...prev.reviewSchedule };
      words.forEach(w => {
        const lw = w.toLowerCase();
        reviewSchedule[lw] = day + reviewInterval(prev.errorCounts[lw] || 0);
      });
      return { ...prev, reviewSchedule };
    });
  }, []);

  const getStats = useCallback(() => {
    const total = data.history.length;
    const correct = data.history.filter(h => h.correct).length;
    const today = data.history.filter(h => h.date === new Date().toISOString().slice(0, 10));
    const totalErrors = Object.values(data.errorCounts).reduce((a, b) => a + b, 0);
    return {
      total, correct,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      wrongWords: data.wrongWords,
      todayTotal: today.length,
      todayCorrect: today.filter(t => t.correct).length,
      totalErrors,
    };
  }, [data]);

  const reset = useCallback(() => {
    setData({ wrongWords: [], history: [], errorCounts: {}, reviewSchedule: {} });
  }, []);

  return { recordResult, getWrongWords, getErrorCounts, getReviewSchedule, markReviewed, getStats, reset };
}
