import { useCallback } from 'react';

export function useSpeech() {
  const speak = useCallback((word: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.7;
    utterance.pitch = 1.1;
    speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
