import BankManager from './components/BankManager';
import TodayPlan from './components/TodayPlan';
import SettingsPanel from './components/SettingsPanel';
import EnrichPanel from './components/EnrichPanel';
import ListenPhase from './components/ListenPhase';
import SpellPhase from './components/SpellPhase';
import DictationPhase from './components/DictationPhase';
import ResultPhase from './components/ResultPhase';
import SummaryPhase from './components/SummaryPhase';
import StatsPanel from './components/StatsPanel';
import { useStats } from './hooks/useStats';
import { useWordBanks } from './hooks/useWordBanks';
import { useStudyPlan } from './hooks/useStudyPlan';
import { useGameStore } from './store/gameStore';
import { useEnrich } from './hooks/useEnrich';

export default function App() {
  const {
    phase, mode, words, currentIndex, isCorrect, lastAnswer,
    roundResults, isReviewMode,
    setPhase, startGame, startReview, submitAnswer, retry,
    nextWord, quit,
  } = useGameStore();

  const { recordResult, getWrongWords } = useStats();
  const { currentBatch } = useWordBanks();
  const { settings, saveSettings, getTodayPlan, advanceDay, resetPlan } = useStudyPlan();
  const { getEnriched } = useEnrich();

  const handleSubmit = (answer: string) => {
    const word = words[currentIndex];
    const correct = answer.toLowerCase() === word.toLowerCase();
    submitAnswer(answer, correct);
    recordResult(word, mode, correct);
  };

  const handleStartGame = (m: typeof mode) => {
    if (!currentBatch || currentBatch.words.length === 0) return;
    const plan = getTodayPlan(currentBatch.words, currentBatch.id);
    let allWords = [...plan.newWords, ...plan.reviewSlots.flatMap(s => s.words)];

    // 如果当前 day 已经超出词库范围，重置并从第1天开始
    if (allWords.length === 0 && currentBatch.words.length > 0) {
      resetPlan(currentBatch.id);
      const newPlan = getTodayPlan(currentBatch.words, currentBatch.id);
      allWords = [...newPlan.newWords, ...newPlan.reviewSlots.flatMap(s => s.words)];
    }

    if (allWords.length > 0) {
      startGame(allWords, m);
    }
  };

  const handleStartReview = (reviewWords: string[]) => {
    if (reviewWords.length === 0) return;
    startReview(reviewWords);
  };

  const handleReviewWrong = () => {
    const wrongWords = getWrongWords();
    handleStartReview(wrongWords);
  };

  const handleFinishRound = () => {
    if (currentBatch) advanceDay(currentBatch.id);
    setPhase('input');
  };

  const handleEnrichDone = async () => {
    // 富化完成后回到首页
    setPhase('input');
  };

  if (phase === 'input') {
    return (
      <BankManager
        onStartGame={handleStartGame}
        onSettings={() => setPhase('settings')}
        onStats={() => setPhase('stats')}
        onEnrich={() => { setPhase('enrich'); }}
        hasWords={!!currentBatch && currentBatch.words.length > 0}
      />
    );
  }

  if (phase === 'enrich') {
    return (
      <EnrichPanel
        words={currentBatch?.words || []}
        onDone={handleEnrichDone}
        onSkip={() => setPhase('input')}
      />
    );
  }

  if (phase === 'settings') {
    return (
      <SettingsPanel
        settings={settings}
        onSave={saveSettings}
        onClose={() => setPhase('input')}
      />
    );
  }

  if (phase === 'plan') {
    return (
      <TodayPlan
        onStart={(todayWords) => startGame(todayWords, mode)}
        onBack={() => setPhase('input')}
      />
    );
  }

  if (phase === 'stats') {
    return (
      <StatsPanel
        onClose={() => setPhase('input')}
        onReviewWrong={handleStartReview}
      />
    );
  }

  if (phase === 'listen') {
    return (
      <div>
        <div className="flex items-center gap-2 px-6 pt-4 max-w-md mx-auto">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 transition"
              style={{ width: `${(currentIndex / words.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{currentIndex + 1}/{words.length}</span>
          <button onClick={quit} className="text-xs text-red-400 font-bold">结束</button>
        </div>
        {isReviewMode && (
          <p className="text-center text-xs text-orange-400 mt-1">错词强化练习</p>
        )}
        <ListenPhase
          word={words[currentIndex]}
          enriched={getEnriched(words[currentIndex])}
          onNext={() => setPhase('play')}
        />
      </div>
    );
  }

  if (phase === 'play') {
    return (
      <div>
        <div className="flex items-center gap-2 px-6 pt-4 max-w-md mx-auto">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-400 transition"
              style={{ width: `${((currentIndex + 0.5) / words.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">{currentIndex + 1}/{words.length}</span>
          <button onClick={quit} className="text-xs text-red-400 font-bold">结束</button>
        </div>
        {mode === 'spell' ? (
          <SpellPhase word={words[currentIndex]} enriched={getEnriched(words[currentIndex])} onSubmit={handleSubmit} onSkip={nextWord} />
        ) : (
          <DictationPhase word={words[currentIndex]} enriched={getEnriched(words[currentIndex])} onSubmit={handleSubmit} onSkip={nextWord} />
        )}
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <ResultPhase
        word={words[currentIndex]}
        answer={lastAnswer}
        isCorrect={isCorrect!}
        enriched={getEnriched(words[currentIndex])}
        onRetry={retry}
        onNext={nextWord}
      />
    );
  }

  if (phase === 'summary') {
    return (
      <SummaryPhase
        results={roundResults}
        totalWords={words.length}
        onPlayAgain={handleFinishRound}
        onReviewWrong={handleReviewWrong}
        hasWrongWords={roundResults.some(r => !r.correct)}
      />
    );
  }

  return null;
}
