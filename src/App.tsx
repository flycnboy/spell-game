import { useEffect } from 'react';
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
import { useCloudSync } from './hooks/useCloudSync';
import type { CloudStatus } from './hooks/useCloudSync';

export default function App() {
  const {
    phase, mode, words, currentIndex, isCorrect, lastAnswer,
    roundResults, isReviewMode,
    setPhase, setMode, setReviewMode, startGame, startReview, submitAnswer, retry,
    skipWord, nextWord, quit,
  } = useGameStore();

  const { recordResult, getWrongWords, markReviewed } = useStats();
  const { currentBatch } = useWordBanks();
  const { settings, saveSettings, getDay, advanceDay } = useStudyPlan();
  const { getEnriched } = useEnrich();
  const { status: syncStatus, touch: syncTouch, start: startSync } = useCloudSync();

  // 启动自动后台云端同步（仅初始化一次）
  useEffect(() => { startSync(); }, []);

  // 复习答案：记录结果并排程下次复习日（不推进学新词进度）
  const handleReviewAnswer = (word: string, correct: boolean) => {
    recordResult(word, mode, correct);
    if (currentBatch) markReviewed([word], getDay(currentBatch.id));
  };

  const handleSubmit = (answer: string) => {
    const word = words[currentIndex];
    const correct = answer.toLowerCase() === word.toLowerCase();
    submitAnswer(answer, correct);
    if (isReviewMode) handleReviewAnswer(word, correct);
    else recordResult(word, mode, correct);
  };

  const handleSkip = () => {
    const word = words[currentIndex];
    skipWord();
    if (isReviewMode) handleReviewAnswer(word, false);
    else recordResult(word, mode, false);
  };

  const handleStartGame = (m: typeof mode) => {
    if (!currentBatch || currentBatch.words.length === 0) return;
    setMode(m);
    setPhase('plan');
  };

  const handleStartReview = (reviewWords: string[]) => {
    if (reviewWords.length === 0) return;
    startReview(reviewWords);
  };

  const handleReviewWrong = () => {
    const wrongWords = getWrongWords();
    if (wrongWords.length === 0) return;
    startReview(wrongWords);
  };

  const handleFinishRound = () => {
    // 复习（强化错词）流程不推进「学新词」的天数进度
    if (!isReviewMode && currentBatch) advanceDay(currentBatch.id);
    // 退出复习模式，避免 isReviewMode 在主屏残留
    if (isReviewMode) setReviewMode(false);
    syncTouch(); // 进度/统计变化，触发后台同步
    setPhase('input');
  };

  const handleEnrichDone = async () => {
    syncTouch(); // 释义变化，触发后台同步
    setPhase('input');
  };

  if (phase === 'input') {
    return (
      <>
        <SyncMini status={syncStatus} />
        <BankManager
          onStartGame={handleStartGame}
          onSettings={() => setPhase('settings')}
          onStats={() => setPhase('stats')}
          onEnrich={() => { setPhase('enrich'); }}
          hasWords={!!currentBatch && currentBatch.words.length > 0}
        />
      </>
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
        mode={mode}
        onStart={(todayWords, m) => startGame(todayWords, m)}
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
          onSkip={handleSkip}
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
          <SpellPhase word={words[currentIndex]} enriched={getEnriched(words[currentIndex])} onSubmit={handleSubmit} onSkip={handleSkip} />
        ) : (
          <DictationPhase word={words[currentIndex]} enriched={getEnriched(words[currentIndex])} onSubmit={handleSubmit} onSkip={handleSkip} />
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
        hasWrongWords={roundResults.some(r => !r.correct) || getWrongWords().length > 0}
      />
    );
  }

  return null;
}

// 主屏顶部的云端同步状态条
function SyncMini({ status }: { status: CloudStatus }) {
  const text =
    status.state === 'idle' ? '云端已同步' :
    status.state === 'syncing' ? '同步中…' :
    status.state === 'pending' ? '本地有改动，自动同步中' :
    status.state === 'error' ? '同步失败' :
    status.state === 'offline' ? '离线，将自动重试' :
    status.state === 'needpass' ? '需输入同步密码' :
    '自动同步未开启';
  const color =
    status.state === 'idle' ? 'bg-green-500' :
    status.state === 'pending' ? 'bg-amber-500' :
    status.state === 'syncing' ? 'bg-blue-500' :
    status.state === 'error' ? 'bg-red-500' :
    status.state === 'offline' ? 'bg-gray-400' :
    status.state === 'needpass' ? 'bg-amber-500' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2 px-6 pt-2 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${color} ${status.state === 'syncing' ? 'animate-pulse' : ''}`} />
      <span>{text}</span>
    </div>
  );
}
