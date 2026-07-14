import { reviewInterval } from './review';

export interface DayState {
  day: number;
  newWords: string[];
  reviewWords: string[]; // 今日到期需复习的单词（按错误次数加权计算）
  done: boolean; // 是否已完成当天学习
}

// 纯函数：根据「学习日 / 每日词数 / 错误次数 / 已排程复习日 / 各词实际学习日」计算今日计划。
// 抽离自 useStudyPlan，便于单测；不依赖 React 与浏览器存储。
// learnedDays: 每个词实际被学的「学习日」(day 序号)。显式固化后可避免中途改每日词数导致排程漂移；
// 若缺失则回退到 index/wpd+1（兼容老数据）。
export function computeTodayPlan(
  allWords: string[],
  day: number,
  wpd: number,
  errorCounts: Record<string, number> = {},
  reviewSchedule: Record<string, number> = {},
  learnedDays: Record<string, number> = {}
): DayState {
  // 今天学的新词
  const start = (day - 1) * wpd;
  const newWords = allWords.slice(start, start + wpd);

  // 需要复习的旧词：按错误次数加权，到期（距学习/上次复习日 >= 间隔）才复习
  const reviewSet = new Set<string>();
  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i].toLowerCase();
    const learnedDay = learnedDays[w] ?? Math.floor(i / wpd) + 1; // 优先用显式固化值
    const daysSinceLearned = day - learnedDay;
    if (daysSinceLearned <= 0) continue; // 尚未学到
    const errors = errorCounts[w] || 0;
    // 下次复习日：复习过则取已排程的日期，否则按学习日 + 间隔推算
    const nextReviewDay = reviewSchedule[w] ?? learnedDay + reviewInterval(errors);
    if (day >= nextReviewDay) {
      reviewSet.add(w);
    }
  }

  return { day, newWords, reviewWords: [...reviewSet], done: false };
}
