import { useState, useCallback } from 'react';
import { useEnrich } from '../hooks/useEnrich';
import type { EnrichedWord } from '../hooks/useEnrich';
import { cloudSync } from '../lib/cloudSync';

interface Props {
  words: string[];
  onDone: () => void;
  onSkip: () => void;
}

type EditableField = 'chinese' | 'definition' | 'example';

export default function EnrichPanel({ words, onDone, onSkip }: Props) {
  const { getEnriched, saveManual, fetchWord } = useEnrich();

  // 本地编辑副本，初始值来自缓存（无网络也能显示已录入内容）
  const [entries, setEntries] = useState<Record<string, EnrichedWord>>(() => {
    const init: Record<string, EnrichedWord> = {};
    words.forEach(w => {
      const lw = w.toLowerCase();
      init[lw] = getEnriched(w) || { word: lw, chinese: '', definition: '', example: '' };
    });
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const update = (w: string, field: EditableField, val: string) =>
    setEntries(prev => ({ ...prev, [w]: { ...prev[w], [field]: val } }));

  const missingCount = words.filter(w => {
    const e = entries[w.toLowerCase()];
    return !e.chinese && !e.definition;
  }).length;

  // 联网获取仅填补完全空缺的词（不覆盖手动内容）
  const handleFetchAll = useCallback(async () => {
    if (missingCount === 0) return;
    setLoading(true);
    const toFetch = words.filter(w => {
      const e = entries[w.toLowerCase()];
      return !e.chinese && !e.definition;
    });
    for (let i = 0; i < toFetch.length; i++) {
      const w = toFetch[i].toLowerCase();
      const fetched = await fetchWord(w);
      setEntries(prev => {
        const cur = prev[w];
        return {
          ...prev,
          [w]: {
            word: w,
            chinese: cur.chinese || fetched.chinese,
            definition: cur.definition || fetched.definition,
            example: cur.example || fetched.example,
            manual: cur.manual,
          },
        };
      });
      setProgress(i + 1);
      await new Promise(r => setTimeout(r, 300));
    }
    setLoading(false);
  }, [words, entries, fetchWord, missingCount]);

  // 保存全部（离线也可用，写入本地缓存）
  const handleSave = () => {
    Object.values(entries).forEach(e => saveManual(e.word, e));
    cloudSync.touch(); // 释义变化，触发后台同步
    onDone();
  };

  return (
    <div className="flex flex-col px-6 py-8 max-w-md mx-auto min-h-screen">
      <h2 className="text-xl font-bold text-gray-700 mb-1">单词释义</h2>
      <p className="text-sm text-gray-400 mb-4">
        可手动录入（离线可用），或联网获取空缺项
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={onSkip}
          disabled={loading}
          className="flex-1 py-2 bg-gray-200 rounded-xl font-bold text-gray-600 text-sm disabled:opacity-50"
        >
          返回
        </button>
        <button
          onClick={handleFetchAll}
          disabled={loading || missingCount === 0}
          className="flex-1 py-2 bg-purple-500 text-white rounded-xl font-bold text-sm disabled:opacity-50"
        >
          {loading ? `获取中 ${progress}/${missingCount}` : (missingCount > 0 ? `联网获取空缺(${missingCount})` : '已全部就绪')}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto">
        {words.map(w => {
          const e = entries[w.toLowerCase()];
          return (
            <div key={w} className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-indigo-600">{w}</span>
                {e.manual && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full">手动</span>
                )}
              </div>
              <input
                value={e.chinese}
                onChange={ev => update(w.toLowerCase(), 'chinese', ev.target.value)}
                placeholder="中文释义"
                className="w-full p-2 mb-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
              />
              <input
                value={e.definition}
                onChange={ev => update(w.toLowerCase(), 'definition', ev.target.value)}
                placeholder="英文释义（可选）"
                className="w-full p-2 mb-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
              />
              <input
                value={e.example}
                onChange={ev => update(w.toLowerCase(), 'example', ev.target.value)}
                placeholder="例句（可选）"
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        className="mt-4 w-full py-3 bg-indigo-500 text-white rounded-xl font-bold text-lg active:bg-indigo-600 shadow-lg"
      >
        保存并返回
      </button>
    </div>
  );
}
