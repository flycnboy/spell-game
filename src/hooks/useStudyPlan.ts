import { useState, useCallback } from 'react';

export interface StudySettings {
  wordsPerDay: number;
  totalDays: number;
}

// 艾宾浩斯复习间隔（天）
const REVIEW_INTERVALS = [1, 7, 16, 30];

interface DayState {
  day: number;
  newWords: string[];
  reviewSlots: { fromDay: number; words: string[] }[];
  done: boolean; // 是否已完成当天学习
}

function getDayKey(batchId: string) {
  return `spellplan_${batchId}`;
}

function loadDay(batchId: string): number {
  try {
    const raw = localStorage.getItem(getDayKey(batchId));
    if (raw) return Number(raw);
  } catch {}
  return 1;
}

function saveDay(batchId: string, day: number) {
  localStorage.setItem(getDayKey(batchId), String(day));
}

export function useStudyPlan() {
  const [settings, setSettings] = useState<StudySettings>(() => {
    try {
      const raw = localStorage.getItem('spellgame_settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return { wordsPerDay: 10, totalDays: 30 };
  });

  const saveSettings = (s: StudySettings) => {
    setSettings(s);
    localStorage.setItem('spellgame_settings', JSON.stringify(s));
  };

  const getTodayPlan = useCallback(
    (allWords: string[], batchId: string): DayState => {
      const day = loadDay(batchId);
      const wpd = settings.wordsPerDay;

      // 今天学的新词
      const start = (day - 1) * wpd;
      const newWords = allWords.slice(start, start + wpd);

      // 需要复习的旧词
      const reviewSlots: { fromDay: number; words: string[] }[] = [];
      for (const interval of REVIEW_INTERVALS) {
        const reviewDay = day - interval;
        if (reviewDay >= 1) {
          const rStart = (reviewDay - 1) * wpd;
          const words = allWords.slice(rStart, rStart + wpd);
          if (words.length > 0) {
            reviewSlots.push({ fromDay: reviewDay, words });
          }
        }
      }

      return { day, newWords, reviewSlots, done: false };
    },
    [settings.wordsPerDay]
  );

  const advanceDay = useCallback((batchId: string) => {
    const day = loadDay(batchId);
    saveDay(batchId, day + 1);
  }, []);

  const resetPlan = useCallback((batchId: string) => {
    saveDay(batchId, 1);
  }, []);

  return { settings, saveSettings, getTodayPlan, advanceDay, resetPlan };
}
