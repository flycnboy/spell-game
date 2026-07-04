export type GameMode = 'spell' | 'dictation';

export type GamePhase =
  | 'input'      // 首页词库管理
  | 'plan'       // 今日学习计划
  | 'stats'      // 统计面板
  | 'settings'   // 设置
  | 'enrich'     // 单词富化
  | 'listen'     // 听音阶段
  | 'play'       // 拼写/听写阶段
  | 'result'     // 单题结果
  | 'summary';   // 完成总结

export interface WordRecord {
  word: string;
  correct: boolean;
}
