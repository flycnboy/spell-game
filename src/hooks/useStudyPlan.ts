import { useState, useCallback } from 'react';
import { computeTodayPlan, type DayState } from '../lib/plan';

export interface StudySettings {
  wordsPerDay: number;
  totalDays: number;
}

function getDayKey(batchId: string) {
  return `spellplan_${batchId}`;
}

function getLearnedKey(batchId: string) {
  return `spellplan_learned_${batchId}`;
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

function loadLearned(batchId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(getLearnedKey(batchId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLearned(batchId: string, map: Record<string, number>) {
  localStorage.setItem(getLearnedKey(batchId), JSON.stringify(map));
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
    (
      allWords: string[],
      batchId: string,
      errorCounts: Record<string, number> = {},
      reviewSchedule: Record<string, number> = {},
      learnedDays: Record<string, number> = {}
    ): DayState => {
      const day = loadDay(batchId);
      const ld = { ...loadLearned(batchId), ...learnedDays };
      const plan = computeTodayPlan(allWords, day, settings.wordsPerDay, errorCounts, reviewSchedule, ld);
      // 固化当天新词的 learnedDay，避免中途改每日词数后排程漂移
      if (plan.newWords.length) {
        const map = loadLearned(batchId);
        let changed = false;
        for (const w of plan.newWords) {
          const k = w.toLowerCase();
          if (map[k] === undefined) { map[k] = day; changed = true; }
        }
        if (changed) saveLearned(batchId, map);
      }
      return plan;
    },
    [settings.wordsPerDay]
  );

  const getLearnedDays = useCallback((batchId: string): Record<string, number> => loadLearned(batchId), []);

  const getDay = useCallback((batchId: string): number => loadDay(batchId), []);

  const advanceDay = useCallback((batchId: string) => {
    const day = loadDay(batchId);
    saveDay(batchId, day + 1);
  }, []);

  const resetPlan = useCallback((batchId: string) => {
    saveDay(batchId, 1);
    localStorage.removeItem(getLearnedKey(batchId));
  }, []);

  return { settings, saveSettings, getTodayPlan, getLearnedDays, getDay, advanceDay, resetPlan };
}
