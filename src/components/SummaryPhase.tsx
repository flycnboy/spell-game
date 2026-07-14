import type { WordRecord } from '../types';

interface Props {
  results: WordRecord[];
  totalWords: number;
  onPlayAgain: () => void;
  onReviewWrong: () => void;
  hasWrongWords: boolean;
}

export default function SummaryPhase({ results, onPlayAgain, onReviewWrong, hasWrongWords }: Props) {
  const correct = results.filter(r => r.correct).length;
  const total = results.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const stars = accuracy >= 90 ? 3 : accuracy >= 60 ? 2 : accuracy > 0 ? 1 : 0;

  return (
    <div className="flex flex-col items-center px-6 py-8 max-w-md mx-auto">
      <p className="text-gray-400 mb-2">本轮成绩</p>

      {/* 星级 */}
      <div className="flex gap-2 text-5xl mb-4">
        {[1, 2, 3].map(i => (
          <span key={i}>{i <= stars ? '⭐' : '☆'}</span>
        ))}
      </div>

      <p className="text-4xl font-extrabold text-indigo-600 mb-2">{accuracy}%</p>
      <p className="text-lg text-gray-500 mb-8">
        {correct} / {total} 正确
      </p>

      {/* 单词结果列表 */}
      <div className="w-full space-y-1 mb-8 max-h-40 overflow-auto">
        {results.map((r, i) => (
          <div key={i} className={`flex justify-between px-4 py-2 rounded-lg ${r.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'}`}>
            <span className="font-mono font-bold">{r.word.toUpperCase()}</span>
            <span>{r.correct ? '✓' : '✗'}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onPlayAgain}
          className="w-full py-3 bg-indigo-500 text-white rounded-xl font-bold text-lg active:bg-indigo-600 shadow-lg"
        >
          再来一轮
        </button>
        {hasWrongWords && (
          <button
            onClick={onReviewWrong}
            className="w-full py-3 bg-orange-400 text-white rounded-xl font-bold active:bg-orange-500 shadow-lg"
          >
            强化练习错词
          </button>
        )}
        <button
          onClick={onPlayAgain}
          className="w-full py-3 text-gray-400 font-bold"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
