import { useState, useEffect, useRef } from 'react';
import type { EnrichedWord } from '../hooks/useEnrich';

interface Props {
  word: string;
  enriched: EnrichedWord | null;
  onSubmit: (answer: string) => void;
}

export default function DictationPhase({ word, enriched, onSubmit }: Props) {
  const [input, setInput] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const wordRef = useRef(word);
  wordRef.current = word;

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const handler = () => {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(wordRef.current);
      u.lang = 'en-US';
      u.rate = 0.7;
      speechSynthesis.speak(u);
    };
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);

  return (
    <div className="flex flex-col items-center px-6 py-8 max-w-md mx-auto">
      <p className="text-gray-400 mb-4 text-lg">写出你听到的单词</p>
      {enriched && <p className="text-sm text-indigo-500 mb-6 animate-fade-in">释义：{enriched.chinese}</p>}

      <button
        ref={btnRef}
        className="w-20 h-20 rounded-full bg-yellow-400 active:bg-yellow-500 shadow-xl flex items-center justify-center text-3xl mb-8 transition"
      >
        🔊
      </button>

      <p className="text-gray-300 text-xs mb-8">点击喇叭可重复播放</p>

      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && input.trim().length > 0) onSubmit(input.trim().toLowerCase()); }}
        autoFocus
        placeholder="在这里输入…"
        className="w-full p-4 border-2 border-gray-200 rounded-xl text-2xl text-center font-bold tracking-widest focus:border-emerald-400 focus:outline-none"
      />

      <button
        disabled={input.trim().length === 0}
        onClick={() => onSubmit(input.trim().toLowerCase())}
        className={`mt-8 px-10 py-3 rounded-xl font-bold text-lg transition ${
          input.trim().length > 0
            ? 'bg-emerald-500 text-white active:bg-emerald-600 shadow-lg'
            : 'bg-gray-200 text-gray-400'
        }`}
      >
        确认
      </button>
    </div>
  );
}
