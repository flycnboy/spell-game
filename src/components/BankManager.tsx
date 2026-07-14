import { useState, useRef } from 'react';
import type { GameMode } from '../types';
import { useWordBanks } from '../hooks/useWordBanks';
import WordEditor from './WordEditor';

const DEFAULT_SYNC_URL = 'https://gist.githubusercontent.com/flycnboy/86d67f60c66736f6dd6092edceab5edf/raw/4ddd37bcdc4cd23681898d271689f35cd78c46f7/Amy%2520words.txt';

interface Props {
  onStartGame: (mode: GameMode) => void;
  onSettings: () => void;
  onStats: () => void;
  onEnrich: (words: string[]) => void;
  hasWords: boolean;
}

export default function BankManager({ onStartGame, onSettings, onStats, onEnrich, hasWords }: Props) {
  const { batches, currentBatch, syncFromUrl, createBatch, deleteBatch, setCurrent, renameBatch, exportAll, importAll } = useWordBanks();
  const [mode, setMode] = useState<GameMode>('spell');
  const [showSync, setShowSync] = useState(false);
  const [syncUrl, setSyncUrl] = useState(DEFAULT_SYNC_URL);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newWords, setNewWords] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const batch = await syncFromUrl(syncUrl);
      setSyncMsg(`同步成功！${batch.words.length} 个单词`);
      setShowSync(false);
    } catch (e: any) {
      setSyncMsg('同步失败: ' + (e.message || '未知错误'));
    }
    setSyncing(false);
  };

  const handleCreate = () => {
    const words = newWords
      .split(/[\n,，]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0 && /^[a-z]+$/i.test(w));
    if (words.length === 0) return;
    createBatch(newLabel || '手动创建', words);
    setShowNew(false);
    setNewLabel('');
    setNewWords('');
  };

  const handleExport = () => {
    const json = exportAll();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wordbacks_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const count = importAll(reader.result as string);
      alert(count > 0 ? `成功导入 ${count} 个词库` : '导入失败，文件格式不正确');
    };
    reader.readAsText(file);
    // 重置 input 以便重复选同一个文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRename = (id: string, label: string) => {
    setRenamingId(id);
    setRenameText(label);
  };

  const commitRename = () => {
    if (renamingId && renameText.trim()) {
      renameBatch(renamingId, renameText.trim());
    }
    setRenamingId(null);
  };

  if (editingBatchId) {
    const batch = batches.find(b => b.id === editingBatchId);
    if (!batch) return null;
    return (
      <WordEditor
        batch={batch}
        onClose={() => setEditingBatchId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col px-6 py-6 max-w-md mx-auto min-h-screen">
      <h1 className="text-3xl font-bold text-indigo-600 mb-6 text-center animate-bounce-in">梓晏的单词学习</h1>
      <p className="text-sm text-gray-400 mb-4 text-center animate-fade-in">
        {currentBatch ? `当前: ${currentBatch.label} (${currentBatch.words.length}词)` : '暂无词库'}
      </p>

      {/* 模式选择 */}
      <div className="flex gap-3 mb-4 animate-fade-in">
        <button
          onClick={() => setMode('spell')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all duration-200 ${
            mode === 'spell'
              ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          🧩 拼写
        </button>
        <button
          onClick={() => setMode('dictation')}
          className={`flex-1 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all duration-200 ${
            mode === 'dictation'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          ✏️ 听写
        </button>
      </div>

      {/* 操作行 */}
      <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
        <button
          onClick={() => setShowSync(true)}
          className="py-2 px-3 bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs active:scale-90 transition-all duration-150 hover:bg-indigo-200"
        >
          🔄 同步远程
        </button>
        <button
          onClick={() => setShowNew(true)}
          className="py-2 px-3 bg-emerald-100 text-emerald-600 rounded-xl font-bold text-xs active:scale-90 transition-all duration-150 hover:bg-emerald-200"
        >
          ＋ 新建本地
        </button>
        <button
          onClick={onSettings}
          className="py-2 px-3 bg-yellow-100 text-yellow-700 rounded-xl font-bold text-xs active:scale-90 transition-all duration-150 hover:bg-yellow-200"
        >
          ⚙️ 设置
        </button>
        <button
          onClick={() => currentBatch && onEnrich(currentBatch.words)}
          disabled={!currentBatch}
          className="py-2 px-3 bg-purple-100 text-purple-600 rounded-xl font-bold text-xs active:scale-90 transition-all duration-150 disabled:opacity-50"
        >
          📖 释义
        </button>
        <button
          onClick={onStats}
          className="py-2 px-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-xs active:scale-90 transition-all duration-150"
        >
          📊 统计
        </button>
      </div>

      {/* 导入导出行 */}
      <div className="flex gap-2 mb-4 animate-fade-in">
        <button
          onClick={handleExport}
          disabled={batches.length === 0}
          className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs disabled:opacity-50"
        >
          📤 导出全部
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs"
        >
          📥 导入文件
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>

      {/* 同步弹窗 */}
      {showSync && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-500 mb-2">粘贴 Gist Raw URL</p>
          <input
            value={syncUrl}
            onChange={e => setSyncUrl(e.target.value)}
            placeholder="https://gist.githubusercontent.com/..."
            className="w-full p-3 border border-gray-200 rounded-lg text-xs focus:border-indigo-400 focus:outline-none"
          />
          {syncMsg && <p className={`text-xs mt-2 ${syncMsg.includes('失败') ? 'text-red-400' : 'text-green-500'}`}>{syncMsg}</p>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowSync(false)} className="flex-1 py-2 bg-gray-200 rounded-lg text-xs">取消</button>
            <button
              disabled={!syncUrl || syncing}
              onClick={handleSync}
              className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-xs disabled:bg-gray-300"
            >
              {syncing ? '同步中…' : '同步'}
            </button>
          </div>
        </div>
      )}

      {/* 新建弹窗 */}
      {showNew && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-500 mb-2">词库名称</p>
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="如：三年级上 Unit1"
            className="w-full p-3 border border-gray-200 rounded-lg text-xs mb-3 focus:border-indigo-400 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mb-2">单词列表（一行一个）</p>
          <textarea
            value={newWords}
            onChange={e => setNewWords(e.target.value)}
            placeholder={'cat\ndog\napple'}
            className="w-full p-3 border border-gray-200 rounded-lg text-xs h-28 resize-none focus:border-indigo-400 focus:outline-none"
          />
          <div className="flex gap-2 mt-3">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 bg-gray-200 rounded-lg text-xs">取消</button>
            <button onClick={handleCreate} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-xs">创建</button>
          </div>
        </div>
      )}

      {/* 词库列表 */}
      <div className="flex-1 space-y-2">
        {batches.map(b => (
          <div
            key={b.id}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition ${
              b.id === currentBatch?.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 bg-white'
            }`}
          >
            <div className="flex-1 min-w-0" onClick={() => setCurrent(b.id)}>
              {renamingId === b.id ? (
                <input
                  value={renameText}
                  onChange={e => setRenameText(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => { if (e.key === 'Enter') commitRename(); }}
                  autoFocus
                  className="w-full text-sm font-bold border border-indigo-300 rounded px-2 py-0.5 focus:outline-none"
                />
              ) : (
                <>
                  <p className="font-bold text-sm truncate">{b.label}</p>
                  <p className="text-xs text-gray-400">{b.words.length}词 · {b.date}{b.source ? ' · 远程' : ' · 本地'}</p>
                </>
              )}
            </div>
            {b.id === currentBatch?.id && (
              <span className="text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">当前</span>
            )}
            <button onClick={() => startRename(b.id, b.label)} className="text-sm px-1" title="改名">✏️</button>
            <button onClick={() => setEditingBatchId(b.id)} className="text-sm px-1" title="编辑">📝</button>
            <button onClick={() => { if (confirm('删除此词库？')) deleteBatch(b.id); }} className="text-sm px-1" title="删除">🗑️</button>
          </div>
        ))}
        {batches.length === 0 && (
          <p className="text-center text-gray-300 py-10 text-sm">还没有词库<br/>请同步远程链接或手动创建</p>
        )}
      </div>

      {/* 底部 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button
          disabled={!hasWords}
          onClick={() => onStartGame(mode)}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white transition ${
            hasWords ? 'bg-indigo-500 active:bg-indigo-600 shadow-lg' : 'bg-gray-300'
          }`}
        >
          开始游戏
        </button>
      </div>
    </div>
  );
}
