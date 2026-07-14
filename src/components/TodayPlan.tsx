import { useStudyPlan } from '../hooks/useStudyPlan';
import { useWordBanks } from '../hooks/useWordBanks';

interface Props {
  mode: 'spell' | 'dictation';
  onStart: (words: string[], mode: 'spell' | 'dictation') => void;
  onBack: () => void;
}

export default function TodayPlan({ mode, onStart, onBack }: Props) {
  const { currentBatch } = useWordBanks();
  const { getTodayPlan, resetPlan } = useStudyPlan();

  if (!currentBatch) return null;

  let plan = getTodayPlan(currentBatch.words, currentBatch.id);
  let allWords = [...plan.newWords, ...plan.reviewSlots.flatMap(s => s.words)];

  // 超出范围自动重置
  if (allWords.length === 0 && currentBatch.words.length > 0) {
    resetPlan(currentBatch.id);
    plan = getTodayPlan(currentBatch.words, currentBatch.id);
    allWords = [...plan.newWords, ...plan.reviewSlots.flatMap(s => s.words)];
  }

  // 模式显示名
  const modeLabel = mode === 'spell' ? '拼写' : '听写';

  return (
    <div className="flex flex-col px-6 py-6 max-w-md mx-auto min-h-screen">
      <h2 className="text-xl font-bold text-gray-700 mb-2">今日学习任务</h2>
      <p className="text-sm text-gray-400 mb-6">第 {plan.day} 天 · {modeLabel}模式</p>

      {plan.newWords.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2 font-bold">🆕 新单词 ({plan.newWords.length})</p>
          <div className="flex flex-wrap gap-2">
            {plan.newWords.map(w => <span key={w} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold">{w}</span>)}
          </div>
        </div>
      )}

      {plan.reviewSlots.map((slot, i) => (
        <div key={i} className="mb-4">
          <p className="text-sm text-gray-500 mb-2 font-bold">📝 复习第 {slot.fromDay} 天的 ({slot.words.length})</p>
          <div className="flex flex-wrap gap-2">
            {slot.words.map(w => <span key={w} className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-bold">{w}</span>)}
          </div>
        </div>
      ))}

      {allWords.length === 0 && (
        <p className="text-center text-gray-300 py-10">词库已学完，请导入新词库或重置学习计划</p>
      )}

      <div className="mt-auto flex gap-3 pt-4 border-t border-gray-100">
        <button onClick={onBack} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-600">返回</button>
        <button
          disabled={allWords.length === 0}
          onClick={() => onStart(allWords, mode)}
          className="flex-[2] py-3 bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg active:bg-indigo-600 disabled:bg-gray-300"
        >
          开始 ({allWords.length}词)
        </button>
      </div>
    </div>
  );
}
