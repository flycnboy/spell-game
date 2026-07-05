import type { EnrichedWord } from '../hooks/useEnrich';

interface Props {
  word: string;
  enriched: EnrichedWord | null;
  onNext: () => void;
}

export default function ListenPhase({ word, enriched, onNext }: Props) {
  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.7;
    utterance.pitch = 1.1;
    utterance.onend = () => console.log('语音播放完毕');
    speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center px-6 max-w-md mx-auto min-h-[70vh]">
      <p className="text-gray-400 mb-4 text-lg">听一听，这是什么单词？</p>

      <button
        onClick={handleSpeak}
        className="w-32 h-32 rounded-full bg-yellow-400 active:bg-yellow-500 shadow-xl flex items-center justify-center text-5xl transition animate-pulse-slow"
      >
        🔊
      </button>

      <p className="text-gray-300 text-sm mt-4 mb-8">点击喇叭播放发音</p>

      {enriched && (
        <div className="w-full bg-indigo-50 p-5 rounded-xl mb-6 animate-fade-in text-center">
          <p className="text-sm text-indigo-600 mb-1">释义：{enriched.chinese}</p>
          <p className="text-sm text-gray-500 italic">{enriched.example.replace(/(^"|"$)/g, '')}</p>
        </div>
      )}

      <button
        onClick={onNext}
        className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold text-lg active:bg-indigo-600 shadow-lg animate-bounce-in"
      >
        开始拼写
      </button>
    </div>
  );
}
