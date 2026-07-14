import { create } from 'zustand';
import type { GamePhase, GameMode, WordRecord } from '../types';

interface GameState {
  phase: GamePhase;
  mode: GameMode;
  words: string[];
  currentIndex: number;
  isCorrect: boolean | null;
  lastAnswer: string;
  roundResults: WordRecord[];
  isReviewMode: boolean;

  setPhase: (phase: GamePhase) => void;
  setMode: (mode: GameMode) => void;
  setReviewMode: (v: boolean) => void;
  startGame: (words: string[], mode: GameMode) => void;
  startReview: (words: string[]) => void;
  submitAnswer: (answer: string, correct: boolean) => void;
  retry: () => void;
  skipWord: () => void;
  nextWord: () => void;
  quit: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  phase: 'input',
  mode: 'spell',
  words: [],
  currentIndex: 0,
  isCorrect: null,
  lastAnswer: '',
  roundResults: [],
  isReviewMode: false,

  setPhase: (phase) => set({ phase }),

  setMode: (mode) => set({ mode }),

  setReviewMode: (v) => set({ isReviewMode: v }),

  startGame: (words, mode) => set({
    words,
    mode,
    currentIndex: 0,
    roundResults: [],
    isReviewMode: false,
    isCorrect: null,
    lastAnswer: '',
    phase: 'listen',
  }),

  startReview: (words) => set({
    words,
    mode: 'spell',
    currentIndex: 0,
    roundResults: [],
    isReviewMode: true,
    isCorrect: null,
    lastAnswer: '',
    phase: 'listen',
  }),

  submitAnswer: (answer, correct) => set((state) => ({
    lastAnswer: answer,
    isCorrect: correct,
    roundResults: [...state.roundResults, { word: state.words[state.currentIndex], correct }],
    phase: 'result',
  })),

  retry: () => set({ isCorrect: null, lastAnswer: '', phase: 'listen' }),

  skipWord: () => set((state) => {
    // 记录为错误
    const word = state.words[state.currentIndex];
    return {
      lastAnswer: '(跳过)',
      isCorrect: false,
      roundResults: [...state.roundResults, { word, correct: false }],
      phase: 'result',
    };
  }),

  nextWord: () => set((state) => {
    if (state.currentIndex + 1 >= state.words.length) {
      return { phase: 'summary', isCorrect: null, lastAnswer: '' };
    }
    return {
      currentIndex: state.currentIndex + 1,
      isCorrect: null,
      lastAnswer: '',
      phase: 'listen',
    };
  }),

  quit: () => set({ isCorrect: null, lastAnswer: '', phase: 'summary' }),

  reset: () => set({
    phase: 'input',
    words: [],
    currentIndex: 0,
    isCorrect: null,
    lastAnswer: '',
    roundResults: [],
    isReviewMode: false,
  }),
}));
