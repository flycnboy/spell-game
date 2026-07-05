import { useCallback, useRef } from 'react';

export function useSpeech() {
  const primed = useRef(false);

  const speak = useCallback((word: string) => {
    // 预热：Android Chrome 首次 speak 会被静默吃掉
    if (!primed.current) {
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(''));
      primed.current = true;
    }

    speechSynthesis.cancel();

    // 等待语音引擎就绪后再发音
    const utter = () => {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.7;
      utterance.pitch = 1.1;

      // 错误处理
      utterance.onerror = () => {
        // 重试一次
        setTimeout(() => {
          speechSynthesis.cancel();
          speechSynthesis.speak(utterance);
        }, 200);
      };

      speechSynthesis.speak(utterance);
    };

    // Android 需要微小延迟让 cancel 生效
    setTimeout(utter, 100);
  }, []);

  return { speak };
}
