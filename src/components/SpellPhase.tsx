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
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [shakeKey, setShakeKey] = useState(0);

  const scrambled = useMemo(() => shuffle(target.split('')), [word]);

  const selectedLetters = useMemo(() =>
    selectedIndices.map(i => scrambled[i]),
    [selectedIndices, scrambled]
  );

  const addLetter = useCallback((letter: string) => {
    if (selectedIndices.length >= target.length) return;

    // 在 scrambled 中找第一个未被选中的匹配字母
    const idx = scrambled.findIndex((l, i) =>
      l === letter && !selectedIndices.includes(i)
    );

    if (idx !== -1) {
      setSelectedIndices(prev => [...prev, idx]);
    } else {
      // 没有可用字母了，抖动提示
      setShakeKey(k => k + 1);
    }
  }, [selectedIndices, scrambled, target.length]);

  const removeLetter = useCallback((slotIndex: number) => {
    setSelectedIndices(prev => prev.filter((_, i) => i !== slotIndex));
  }, []);

  // 键盘输入
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        if (selectedIndices.length > 0) {
          setSelectedIndices(prev => prev.filter((_, i) => i !== prev.length - 1));
        }
        return;
      }
      if (e.key === 'Enter') {
        if (selectedIndices.length === target.length) {
          const answer = selectedIndices.map(i => scrambled[i]).join('');
          onSubmit(answer);
        }
        return;
      }
      if (e.key.length !== 1) return;
      const letter = e.key.toLowerCase();
      if (!/[a-z]/.test(letter)) return;
      addLetter(letter);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addLetter, selectedIndices.length, target.length, scrambled, onSubmit]);

  return (
    <div className="flex flex-col items-center px-6 py-8 max-w-md mx-auto">
      <p className="text-gray-400 mb-4 text-lg">拼出你听到的单词</p>
      {enriched && <p className="text-sm text-indigo-500 mb-6 animate-fade-in">释义：{enriched.chinese}</p>}

      {/* 拼写格 */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: target.length }).map((_, i) => (
          <div
            key={i}
            onClick={() => selectedLetters[i] && removeLetter(i)}
            className={`w-12 h-14 border-b-4 flex items-center justify-center text-2xl font-extrabold transition ${
              selectedLetters[i]
                ? 'border-indigo-400 text-indigo-700 bg-indigo-50 rounded-lg active:bg-red-100 cursor-pointer'
                : 'border-gray-300 text-gray-300'
            }`}
          >
            {selectedLetters[i] || ''}
          </div>
        ))}
      </div>

      {/* 候选字母：按索引判断是否已被选中 */}
      <div className={`flex flex-wrap gap-3 justify-center ${shakeKey > 0 ? 'animate-wiggle' : ''}`} key={`shake-${shakeKey}`}>
        {scrambled.map((letter, i) => {
          const isSelected = selectedIndices.includes(i);
          return (
            <button
              key={i}
              disabled={isSelected || selectedIndices.length >= target.length}
              onClick={() => addLetter(letter)}
              className={`w-14 h-14 rounded-xl text-2xl font-extrabold shadow transition ${
                isSelected
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
        disabled={selectedIndices.length !== target.length}
        onClick={() => onSubmit(selectedLetters.join(''))}
        className={`mt-6 px-10 py-3 rounded-xl font-bold text-lg transition ${
          selectedIndices.length === target.length
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
