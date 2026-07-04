import { useState, useCallback } from 'react';
import { useEnrich } from '../hooks/useEnrich';

interface Props {
  words: string[];
  onDone: () => void;
  onSkip: () => void;
}

export default function EnrichPanel({ words, onDone, onSkip }: Props) {
  const { enrichWords, getEnriched } = useEnrich();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const neededWords = words.filter(w => !getEnriched(w));
  const totalNeeded = neededWords.length;

  const handleStart = useCallback(async () => {
    if (totalNeeded === 0) { onDone(); return; }
    setLoading(true);
    await enrichWords(neededWords, (done) => {
      setProgress(done);
    });
    setLoading(false);
    onDone();
  }, [neededWords, enrichWords, onDone, totalNeeded]);

  return (
    <div className="flex flex-col px-6 py-8 max-w-md mx-auto min-h-screen">
      <h2 className="text-xl font-bold text-gray-700 mb-2">丰富单词信息</h2>
      <p className="text-sm text-gray-400 mb-6">
        共有 {words.length} 个单词，{totalNeeded} 个需要获取新信息
      </p>

      <div className="bg-indigo-50 rounded-xl p-4 mb-6">
        {loading ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition"
                  style={{ width: `${(progress / totalNeeded) * 100}%` }}
                />
              </div>
              <span className="text-xs text-indigo-600 font-bold">{progress}/{totalNeeded}</span>
            </div>
            <p className="text-xs text-gray-400">正在获取新信息…</p>
          </div>
        ) : (
          <p className="text-sm text-indigo-600">
            {totalNeeded > 0
              ? `需要联网获取 ${totalNeeded} 个新词信息，约需 ${Math.ceil(totalNeeded * 0.5)} 秒`
              : '所有单词已有释义！'}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
        <button
          onClick={onSkip}
          disabled={loading}
          className={`flex-1 py-3 rounded-xl font-bold transition-all active:scale-95 ${loading ? 'bg-gray-100 text-gray-300' : 'bg-gray-200 text-gray-600'}`}
        >
          返回
        </button>
        <button
          onClick={loading ? undefined : handleStart}
          className="flex-[2] py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all bg-indigo-500 text-white active:bg-indigo-600"
        >
          {loading ? '获取中…' : (totalNeeded === 0 ? '已完成，返回' : '开始获取')}
        </button>
      </div>
    </div>
  );
}
