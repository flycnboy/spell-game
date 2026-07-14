import { useStats } from '../hooks/useStats';

interface Props {
  onClose: () => void;
  onReviewWrong: (words: string[]) => void;
}

export default function StatsPanel({ onClose, onReviewWrong }: Props) {
  const { getStats, reset } = useStats();
  const stats = getStats();

  return (
    <div className="flex flex-col items-center px-6 py-8 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-indigo-600 mb-6">学习统计</h2>

      <div className="grid grid-cols-2 gap-4 w-full mb-6">
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-indigo-600">{stats.total}</p>
          <p className="text-sm text-gray-500">总学习次数</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-green-600">{stats.accuracy}%</p>
          <p className="text-sm text-gray-500">正确率</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-yellow-600">{stats.todayTotal}</p>
          <p className="text-sm text-gray-500">今日学习</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-extrabold text-red-400">{stats.wrongWords.length}</p>
          <p className="text-sm text-gray-500">错词数量</p>
        </div>
      </div>

      {stats.wrongWords.length > 0 && (
        <div className="w-full mb-6">
          <p className="text-sm font-bold text-gray-500 mb-2">错词列表</p>
          <div className="space-y-1 max-h-32 overflow-auto">
            {stats.wrongWords.map((w, i) => (
              <div key={i} className="px-4 py-2 bg-red-50 rounded-lg text-red-500 font-mono font-bold">
                {w.toUpperCase()}
              </div>
            ))}
          </div>
          <button
            onClick={() => onReviewWrong(stats.wrongWords)}
            className="w-full mt-2 py-2 bg-orange-400 text-white rounded-xl font-bold active:bg-orange-500"
          >
            强化练习错词
          </button>
        </div>
      )}

      <div className="flex gap-3 w-full">
        <button
          onClick={() => { reset(); onClose(); }}
          className="flex-1 py-3 rounded-xl text-red-400 font-bold"
        >
          清零重置
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-gray-200 text-gray-600 font-bold"
        >
          返回
        </button>
      </div>
    </div>
  );
}
