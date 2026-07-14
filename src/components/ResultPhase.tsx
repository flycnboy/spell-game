import { useState } from 'react';
import type { EnrichedWord } from '../hooks/useEnrich';

interface Props {
  word: string;
  answer: string;
  isCorrect: boolean;
  enriched: EnrichedWord | null;
  onRetry: () => void;
  onNext: () => void;
}

export default function ResultPhase({ word, answer, isCorrect, enriched, onRetry, onNext }: Props) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="flex flex-col items-center px-6 py-8 max-w-md mx-auto">
      {/* 单词解释区（无论对错都展示） */}
      {enriched && (
        <div className="w-full bg-gray-50 p-4 rounded-xl mb-6 animate-fade-in text-center">
          <p className="text-2xl font-bold text-gray-800 mb-1">{word.toLowerCase()}</p>
          {enriched.chinese && <p className="text-sm text-indigo-600 mb-1">释义：{enriched.chinese}</p>}
          {enriched.example && <p className="text-base text-gray-500 italic mb-1">{enriched.example.replace(/(^"|"$)/g, '')}</p>}
          {enriched.definition && <p className="text-sm text-gray-400">{enriched.definition}</p>}
        </div>
      )}

      {isCorrect ? (
        <>
          <div className="text-6xl animate-pop mb-4">🎉</div>
          <p className="text-xl font-bold text-green-500 mb-8">太棒了！</p>
          <button
            onClick={onNext}
            className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg active:bg-green-600 shadow-lg"
          >
            下一题
          </button>
        </>
      ) : (
        <>
          <div className="text-6xl animate-wiggle mb-4">😅</div>
          <p className="text-xl font-bold text-red-400 mb-4">再试试</p>
          <p className="text-sm text-gray-400 mb-4">你拼的是：<span className="text-red-500 font-bold">{answer.toLowerCase()}</span></p>

          {showAnswer && (
            <p className="text-lg font-bold text-green-600 mb-4 animate-fade-in">
              正确答案：{word.toLowerCase()}
            </p>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={onRetry}
              className="flex-1 py-4 bg-orange-400 text-white rounded-xl font-bold active:bg-orange-500 shadow-lg"
            >
              重试
            </button>
            <button
              onClick={() => setShowAnswer(true)}
              className="flex-1 py-4 bg-blue-400 text-white rounded-xl font-bold active:bg-blue-500 shadow-lg text-sm"
            >
              {showAnswer ? '已显示答案' : '显示答案'}
            </button>
            <button
              onClick={onNext}
              className="flex-1 py-4 bg-gray-300 text-gray-600 rounded-xl font-bold active:bg-gray-400"
            >
              跳过
            </button>
          </div>
        </>
      )}
    </div>
  );
}
