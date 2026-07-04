import { useState } from 'react';
import { useWordBanks } from '../hooks/useWordBanks';
import { useEnrich } from '../hooks/useEnrich';
import type { WordBatch } from '../hooks/useWordBanks';

interface Props {
  batch: WordBatch;
  onClose: () => void;
}

export default function WordEditor({ batch, onClose }: Props) {
  const { batches, renameBatch, updateBatchWords, createBatch } = useWordBanks();
  const { exportJson } = useEnrich();
  const [label, setLabel] = useState(batch.label);
  const [wordsText, setWordsText] = useState(batch.words.join(', '));
  const [newWord, setNewWord] = useState('');

  // 从其他词库导入
  const [showImport, setShowImport] = useState(false);
  const [selectedImport, setSelectedImport] = useState<string[]>([]);

  // 勾选单词 → 另存新词库
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [newBankName, setNewBankName] = useState('');

  const parsed = wordsText
    .split(/[\n,，\s]+/)
    .map(w => w.trim().toLowerCase())
    .filter(w => w.length > 0 && /^[a-z]+$/i.test(w));

  const unique = [...new Set(parsed)];

  const otherBatches = batches.filter(b => b.id !== batch.id);

  const handleSave = () => {
    renameBatch(batch.id, label);
    updateBatchWords(batch.id, unique);
    onClose();
  };

  const handleAddWord = () => {
    const w = newWord.trim().toLowerCase();
    if (w && /^[a-z]+$/i.test(w) && !unique.includes(w)) {
      setWordsText([...unique, w].join(', '));
      setNewWord('');
    }
  };

  const handleRemoveWord = (word: string) => {
    setWordsText(prevText => {
      const current = prevText
        .split(/[\n,，\s]+/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length > 0 && /^[a-z]+$/i.test(w));
      return current.filter(w => w !== word).join(', ');
    });
  };

  // 从其他词库勾选导入
  const handleImportConfirm = () => {
    if (selectedImport.length === 0) return;
    const merged = [...new Set([...unique, ...selectedImport])];
    setWordsText(merged.join(', '));
    setSelectedImport([]);
    setShowImport(false);
  };

  // 勾选 → 另存新词库
  const handleSavePicked = () => {
    const pickedWords = [...picked];
    if (pickedWords.length === 0 || !newBankName.trim()) return;
    createBatch(newBankName.trim(), pickedWords);
    setPickMode(false);
    setPicked(new Set());
    setNewBankName('');
  };

  // 把所有单词全选/取消
  const toggleSelectAll = () => {
    if (picked.size === unique.length) {
      setPicked(new Set());
    } else {
      setPicked(new Set(unique));
    }
  };

  return (
    <div className="flex flex-col px-6 py-6 max-w-md mx-auto min-h-screen">
      <h2 className="text-xl font-bold text-gray-700 mb-4">
        {pickMode ? '勾选单词 → 另存新词库' : '编辑词库'}
      </h2>

      {!pickMode && (
        <>
          <label className="text-sm text-gray-500 mb-1">名称</label>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm mb-4 focus:border-indigo-400 focus:outline-none"
          />

          <label className="text-sm text-gray-500 mb-1">
            单词列表（{unique.length} 个，逗号或换行分隔）
          </label>
          <textarea
            value={wordsText}
            onChange={e => setWordsText(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm h-32 resize-none mb-4 focus:border-indigo-400 focus:outline-none font-mono"
          />

          {/* 快速增删 */}
          <div className="flex gap-2 mb-4">
            <input
              value={newWord}
              onChange={e => setNewWord(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddWord(); }}
              placeholder="添加一个单词…"
              className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-emerald-400 focus:outline-none"
            />
            <button
              onClick={handleAddWord}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm active:bg-emerald-600"
            >
              添加
            </button>
          </div>

          {/* 单词标签，点击删除 */}
          <div className="flex flex-wrap gap-2 mb-6 max-h-40 overflow-auto">
            {unique.map(w => (
              <span
                key={w}
                onClick={() => handleRemoveWord(w)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-sm font-bold cursor-pointer active:bg-red-100 active:text-red-500"
              >
                {w} <span className="text-xs opacity-50">×</span>
              </span>
            ))}
          </div>
        </>
      )}

      {/* 勾选模式 — 选词区域 */}
      {pickMode && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <input
              value={newBankName}
              onChange={e => setNewBankName(e.target.value)}
              placeholder="新词库名称，如：生词库"
              className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:border-indigo-400 focus:outline-none"
            />
          </div>
          <p className="text-xs text-gray-400 mb-2">
            已选 {picked.size} / {unique.length} 词
          </p>
          <div className="flex flex-wrap gap-2 mb-4 max-h-60 overflow-auto">
            {unique.map(w => (
              <span
                key={w}
                onClick={() => {
                  const next = new Set(picked);
                  if (next.has(w)) next.delete(w); else next.add(w);
                  setPicked(next);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold cursor-pointer transition ${
                  picked.has(w)
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 从其他词库导入 */}
      {showImport && (
        <div className="border-t pt-4 mb-4">
          <p className="text-sm font-bold text-gray-500 mb-2">选择要导入的单词</p>
          {otherBatches.map(ob => (
            <div key={ob.id} className="mb-3">
              <p className="text-xs text-gray-400 mb-1">{ob.label} ({ob.words.length}词)</p>
              <div className="flex flex-wrap gap-1">
                {ob.words.map(w => (
                  <span
                    key={w}
                    onClick={() => {
                      setSelectedImport(prev =>
                        prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
                      );
                    }}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer ${
                      selectedImport.includes(w)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowImport(false)} className="flex-1 py-2 bg-gray-200 rounded-lg text-xs">取消</button>
            <button onClick={handleImportConfirm} className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-xs">导入</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-auto pt-4 border-t border-gray-100">
        {!pickMode && (
          <>
            <button onClick={onClose} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-600 text-sm">取消</button>
            <button onClick={handleSave} className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-bold text-sm">保存</button>
          </>
        )}
        {!pickMode && (
          <button
            onClick={() => { setPickMode(true); setPicked(new Set()); }}
            className="w-full py-2 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-sm"
          >
            📤 勾选单词 → 另存新词库
          </button>
        )}
        {pickMode && (
          <>
            <button onClick={() => { setPickMode(false); }} className="flex-1 py-3 bg-gray-200 rounded-xl font-bold text-gray-600 text-sm">取消</button>
            <button onClick={toggleSelectAll} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-500 text-sm">
              {picked.size === unique.length ? '取消全选' : '全选'}
            </button>
            <button
              disabled={picked.size === 0 || !newBankName.trim()}
              onClick={handleSavePicked}
              className={`flex-1 py-3 rounded-xl font-bold text-sm text-white ${picked.size > 0 && newBankName.trim() ? 'bg-emerald-500 active:bg-emerald-600' : 'bg-gray-300'}`}
            >
              另存为「{newBankName.trim() || '新词库'}」
            </button>
          </>
        )}
        {otherBatches.length > 0 && !pickMode && (
          <button
            onClick={() => setShowImport(true)}
            className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm"
          >
            📥 从其他词库导入单词
          </button>
        )}
        {!pickMode && (
          <button
            onClick={() => {
              const json = exportJson(unique);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${batch.label || 'wordbank'}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm"
          >
            💾 导出含释义的 JSON
          </button>
        )}
      </div>
    </div>
  );
}
