// 复习间隔按「错误次数」加权：错得越多，复习越频繁
// errorCount: 0 → 30天(已掌握) / 1 → 15 / 2 → 7 / 3 → 3 / ≥4 → 每日
export function reviewInterval(errorCount: number): number {
  if (errorCount <= 0) return 30;
  if (errorCount === 1) return 15;
  if (errorCount === 2) return 7;
  if (errorCount === 3) return 3;
  return 1;
}

// 根据「当前学习日 + 间隔」计算下次复习日
export function scheduleNextReview(currentDay: number, errorCount: number): number {
  return currentDay + reviewInterval(errorCount);
}
