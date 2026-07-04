import { useState, useCallback, useEffect } from 'react';

export interface WordBatch {
  id: string;
  label: string;
  date: string;
  words: string[];
  source: string;   // Gist URL，空字符串 = 手动创建
}

interface Stored {
  batches: WordBatch[];
  currentBatchId: string | null;
}

function load(): Stored {
  try {
    const raw = localStorage.getItem('spellgame_batches');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { batches: [], currentBatchId: null };
}

function save(data: Stored) {
  localStorage.setItem('spellgame_batches', JSON.stringify(data));
}

function makeId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

export function useWordBanks() {
  const [data, setData] = useState<Stored>(load);

  useEffect(() => { save(data); }, [data]);

  const currentBatch = data.batches.find(b => b.id === data.currentBatchId) || null;

  // 从远程 URL 同步
  const syncFromUrl = useCallback(async (sourceUrl: string) => {
    const resp = await fetch(sourceUrl);
    const text = await resp.text();
    const words = text
      .split(/[\n,，\s]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0 && /^[a-z]+$/i.test(w));

    const batch: WordBatch = {
      id: makeId(),
      label: new Date().toISOString().slice(0, 10) + ' 同步',
      date: new Date().toISOString().slice(0, 10),
      words,
      source: sourceUrl,
    };

    setData(prev => {
      const next = { ...prev, batches: [...prev.batches, batch], currentBatchId: batch.id };
      return next;
    });

    return batch;
  }, []);

  // 手动创建词库
  const createBatch = useCallback((label: string, words: string[]) => {
    const batch: WordBatch = {
      id: makeId(),
      label,
      date: new Date().toISOString().slice(0, 10),
      words,
      source: '',
    };
    setData(prev => ({
      ...prev,
      batches: [...prev.batches, batch],
      currentBatchId: batch.id,
    }));
    return batch;
  }, []);

  // 编辑词库单词（增删）
  const updateBatchWords = useCallback((batchId: string, words: string[]) => {
    setData(prev => ({
      ...prev,
      batches: prev.batches.map(b => b.id === batchId ? { ...b, words } : b),
    }));
  }, []);

  // 重命名词库
  const renameBatch = useCallback((batchId: string, label: string) => {
    setData(prev => ({
      ...prev,
      batches: prev.batches.map(b => b.id === batchId ? { ...b, label } : b),
    }));
  }, []);

  // 删除词库
  const deleteBatch = useCallback((batchId: string) => {
    setData(prev => {
      const batches = prev.batches.filter(b => b.id !== batchId);
      const currentBatchId = prev.currentBatchId === batchId
        ? (batches[0]?.id || null)
        : prev.currentBatchId;
      return { ...prev, batches, currentBatchId };
    });
  }, []);

  // 设置当前词库
  const setCurrent = useCallback((batchId: string) => {
    setData(prev => ({ ...prev, currentBatchId: batchId }));
  }, []);

  // 获取用于游戏的单词列表
  const getGameWords = useCallback((): string[] => {
    return currentBatch?.words || [];
  }, [currentBatch]);

  return {
    batches: data.batches,
    currentBatch,
    syncFromUrl,
    createBatch,
    updateBatchWords,
    renameBatch,
    deleteBatch,
    setCurrent,
    getGameWords,
  };
}
