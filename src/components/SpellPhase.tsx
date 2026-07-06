import { useState, useMemo, useCallback, useEffect } from 'react';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

import type { EnrichedWord } from '../hooks/useEnrich';

interface Props {
  word: string;
  enriched: EnrichedWord | null;
  onSubmit: (answer: string) => void;
  onSkip: () => void;
}

export default function SpellPhase({ word, enriched, onSubmit, onSkip }: Props) {
  const target = word.toLowerCase();
  const [selected, setSelected] = useState<string[]>([]);
  const [shakeKey, setShakeKey] = useState(0);

  const scrambled = useMemo(() => shuffle(target.split('')), [word]);

  const letterCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of target) map[l] = (map[l] || 0) + 1;
    return map;
  }, [target]);

  const selectedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of selected) map[l] = (map[l] || 0) + 1;
    return map;
  }, [selected]);

  const addLetter = useCallback((letter: string) => {
    const used = selectedCounts[letter] || 0;
    const total = letterCounts[letter] || 0;
    if (used < total && selected.length < target.length) {
      setSelected(prev => [...prev, letter]);
      return;
    }
    // 这个字母已经被用完了，抖动提示
    if (used >= total) {
      setShakeKey(k => k + 1);
    }
  }, [selected.length, target.length, selectedCounts, letterCounts]);

  const removeLetter = useCallback((index: number) => {
    setSelected(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 键盘输入：只接受 target 中存在的字母，Backspace删除
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        if (selected.length > 0) removeLetter(selected.length - 1);
        return;
      }
      if (e.key === 'Enter') {
        if (selected.length === target.length) onSubmit(selected.join(''));
        return;
      }
      if (e.key.length !== 1) return;
      const letter = e.key.toLowerCase();
      if (!/[a-z]/.test(letter)) return;
      addLetter(letter);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addLetter, removeLetter, selected.length, target.length, onSubmit]);

  return (
    <div className="flex flex-col items-center px-6 py-8 max-w-md mx-auto">
      <p className="text-gray-400 mb-4 text-lg">拼出你听到的单词</p>
      {enriched && <p className="text-sm text-indigo-500 mb-6 animate-fade-in">释义：{enriched.chinese}</p>}

      {/* 拼写格 */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: target.length }).map((_, i) => (
          <div
            key={i}
            onClick={() => selected[i] && removeLetter(i)}
            className={`w-12 h-14 border-b-4 flex items-center justify-center text-2xl font-extrabold transition ${
              selected[i]
                ? 'border-indigo-400 text-indigo-700 bg-indigo-50 rounded-lg active:bg-red-100 cursor-pointer'
                : 'border-gray-300 text-gray-300'
            }`}
          >
            {selected[i] || ''}
          </div>
        ))}
      </div>

      {/* 候选字母 */}
      <div className={`flex flex-wrap gap-3 justify-center ${shakeKey > 0 ? 'animate-wiggle' : ''}`} key={`shake-${shakeKey}`}>
        {scrambled.map((letter, i) => {
          const used = selectedCounts[letter] || 0;
          const total = letterCounts[letter] || 0;
          const isUsed = used >= total;
          return (
            <button
              key={i}
              disabled={isUsed || selected.length >= target.length}
              onClick={() => addLetter(letter)}
              className={`w-14 h-14 rounded-xl text-2xl font-extrabold shadow transition ${
                isUsed
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-white border-2 border-indigo-300 text-indigo-600 active:bg-indigo-100 active:scale-95'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-3">💡 点击字母 或 键盘输入</p>

      <button
        disabled={selected.length !== target.length}
        onClick={() => onSubmit(selected.join(''))}
        className={`mt-6 px-10 py-3 rounded-xl font-bold text-lg transition ${
          selected.length === target.length
            ? 'bg-indigo-500 text-white active:bg-indigo-600 shadow-lg'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        确认
      </button>

      <button
        onClick={onSkip}
        className="mt-3 px-6 py-2 text-sm text-gray-400 font-bold"
      >
        放弃本单词，下一个 →
      </button>
    </div>
  );
}
