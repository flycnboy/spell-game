import { useStudyPlan } from '../hooks/useStudyPlan';
import { useWordBanks } from '../hooks/useWordBanks';

interface Props {
  onStart: (words: string[]) => void;
  onBack: () => void;
}

export default function TodayPlan({ onStart, onBack }: Props) {
  const { currentBatch } = useWordBanks();
  const { getTodayPlan } = useStudyPlan();

  if (!currentBatch) return null;

  const plan = getTodayPlan(currentBatch.words, currentBatch.id);
  const allWords = [...plan.newWords, ...plan.reviewSlots.flatMap(s => s.words)];

  return (
    <div className="flex flex-col px-6 py-6 max-w-md mx-auto min-h-screen">
      <h2 className="text-xl font-bold text-gray-700 mb-6">今日学习任务 (第 {plan.day} 天)</h2>

      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-2 font-bold">新单词 ({plan.newWords.length})</p>
        <div className="flex flex-wrap gap-2">
          {plan.newWords.map(w => <span key={w} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold">{w}</span>)}
        </div>
      </div>

      {plan.reviewSlots.map((slot, i) => (
        <div key={i} className="mb-6">
          <p className="text-sm text-gray-500 mb-2 font-bold">复习 {slot.fromDay} 天前的 ({slot.words.length})</p>
          <div className="flex flex-wrap gap-2">
            {slot.words.map(w => <span key={w} className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-sm font-bold">{w}</span>)}
          </div>
        </div>
      ))}

      <div className="mt-auto flex gap-3 pt-4 border-t border-gray-100">
        <button onClick={onBack} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-600">返回</button>
        <button
          onClick={() => onStart(allWords)}
          className="flex-[2] py-3 bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg active:bg-indigo-600"
        >
          开始练习 ({allWords.length}词)
        </button>
      </div>
    </div>
  );
}
