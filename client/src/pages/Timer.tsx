import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  XCircle,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  BookOpen,
  CheckSquare,
  Sparkles,
  Coffee,
  Check,
  Square,
} from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { getRandomQuote } from '../lib/quotes';
import { SessionType, StudyTask } from '../types';
import { apiRequest } from '../lib/api';

export const TimerPage: React.FC = () => {
  const {
    status,
    mode,
    secondsRemaining,
    totalDuration,
    cycleCount,
    startTimer,
    pauseTimer,
    resumeTimer,
    endSession,
    resetTimer,
    skipSession,
    abandonSession,
    switchMode,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTaskId,
    setSelectedTaskId,
    soundEnabled,
    setSoundEnabled,
    notificationsEnabled,
    setNotificationsEnabled,
    showCompletionModal,
    closeCompletionModal,
    proceedToNextSession,
    lastCompletedMode,
  } = useTimer();

  const { subjects, preference } = useAuth();
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [quote, setQuote] = useState(() => getRandomQuote());
  const [isQuoteTransitioning, setIsQuoteTransitioning] = useState<boolean>(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Cycle quote occasionally with smooth text transition
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setIsQuoteTransitioning(true);
      setTimeout(() => {
        setQuote(getRandomQuote());
        setIsQuoteTransitioning(false);
      }, 200);
    }, 60000);
    return () => clearInterval(quoteInterval);
  }, []);

  // Fetch active tasks for task selector
  useEffect(() => {
    apiRequest<{ tasks: StudyTask[] }>('/api/tasks?filter=all')
      .then((data) => {
        setTasks(data.tasks.filter((t) => !t.isCompleted));
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcut listeners (Space for play/pause, R for reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'RUNNING') {
          pauseTimer();
        } else if (status === 'PAUSED') {
          resumeTimer();
        } else if (status === 'IDLE') {
          startTimer();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (status === 'IDLE') {
          resetTimer();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, startTimer, pauseTimer, resumeTimer, resetTimer]);

  // Format time MM:SS
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // SVG circular progress calculation
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDuration > 0 ? (totalDuration - secondsRemaining) / totalDuration : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Theme colors per mode
  const modeColorsMap = {
    FOCUS: {
      text: 'text-focus-500',
      stroke: '#4F7CFF',
      badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      glow: 'drop-shadow(0 0 20px rgba(79, 124, 255, 0.3))',
      primaryBtn: 'bg-focus-500 hover:bg-focus-600 shadow-md',
    },
    SHORT_BREAK: {
      text: 'text-emerald-400',
      stroke: '#10B981',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      glow: 'drop-shadow(0 0 20px rgba(16, 185, 129, 0.3))',
      primaryBtn: 'bg-emerald-500 hover:bg-emerald-600 shadow-md',
    },
    LONG_BREAK: {
      text: 'text-violet-400',
      stroke: '#7C3AED',
      badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
      glow: 'drop-shadow(0 0 20px rgba(124, 58, 237, 0.3))',
      primaryBtn: 'bg-violet-600 hover:bg-violet-700 shadow-md',
    },
    STOPWATCH: {
      text: 'text-amber-400',
      stroke: '#F59E0B',
      badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      glow: 'drop-shadow(0 0 20px rgba(245, 158, 11, 0.3))',
      primaryBtn: 'bg-amber-500 hover:bg-amber-600 shadow-md',
    },
  };
  const modeColors = modeColorsMap[mode] || modeColorsMap.FOCUS;

  const longBreakInterval = preference?.longBreakInterval || 4;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-center">
        <div className="p-1.5 rounded-2xl glass-card border border-slate-800 flex space-x-1 sm:space-x-2">
          {(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK'] as SessionType[]).map((m) => {
            const isCurrent = mode === m;
            const labels = {
              FOCUS: 'Focus (25m)',
              SHORT_BREAK: 'Short Break (5m)',
              LONG_BREAK: 'Long Break (15m)',
            };
            return (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isCurrent
                    ? 'bg-slate-800 text-white shadow-md border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {labels[m]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Circular Timer Display Card */}
      <div className="glass-card rounded-3xl p-8 sm:p-12 border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
        {/* Cycle Dots Indicator */}
        <div className="flex items-center space-x-2.5 mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
            Interval {cycleCount} of {longBreakInterval}
          </span>
          {Array.from({ length: longBreakInterval }).map((_, idx) => {
            const isCompleted = idx + 1 < cycleCount;
            const isCurrent = idx + 1 === cycleCount;
            return (
              <div
                key={idx}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-focus-500 scale-100'
                    : isCurrent && status === 'RUNNING'
                    ? 'bg-focus-400 ring-4 ring-focus-500/20 animate-pulse'
                    : 'bg-slate-800 border border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Circular SVG Ring */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-4">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
            {/* Background track circle */}
            <circle
              cx="150"
              cy="150"
              r={radius}
              className="stroke-slate-800/80"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated progress ring */}
            <circle
              cx="150"
              cy="150"
              r={radius}
              stroke={modeColors.stroke}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              style={{
                transition: 'stroke-dashoffset 0.3s ease-in-out',
                filter: modeColors.glow,
              }}
            />
          </svg>

          {/* Center countdown numbers & status */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className={`text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border mb-1 ${modeColors.badgeBg}`}>
              {mode === 'FOCUS' ? 'Focused Study' : mode === 'SHORT_BREAK' ? 'Short Break' : 'Long Break'}
            </span>

            <span className="text-6xl sm:text-7xl font-extrabold text-white font-mono tracking-tight my-1 select-none">
              {timeString}
            </span>

            <span className="text-xs text-slate-400 font-medium">
              {status === 'RUNNING'
                ? 'Interval in progress'
                : status === 'PAUSED'
                ? 'Timer paused'
                : 'Ready to start'}
            </span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center space-x-4 mt-6">
          {status === 'IDLE' && (
            <button
              onClick={startTimer}
              className={`flex items-center space-x-2.5 px-8 py-4 rounded-2xl text-white font-extrabold text-base transition-all duration-200 hover:scale-105 active:scale-95 ${modeColors.primaryBtn}`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start</span>
            </button>
          )}

          {status === 'RUNNING' && (
            <button
              onClick={pauseTimer}
              className="flex items-center space-x-2.5 px-8 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-base border border-slate-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause</span>
            </button>
          )}

          {status === 'PAUSED' && (
            <button
              onClick={resumeTimer}
              className={`flex items-center space-x-2.5 px-8 py-4 rounded-2xl text-white font-extrabold text-base transition-all duration-200 hover:scale-105 active:scale-95 ${modeColors.primaryBtn}`}
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Resume</span>
            </button>
          )}

          {/* End Session Button (Right beside Start / Pause / Resume) */}
          {status === 'IDLE' ? (
            <button
              disabled
              title="Start a session first before ending it"
              className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-slate-900/40 text-slate-600 border border-white/[0.04] cursor-not-allowed opacity-50 font-bold text-sm"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Session</span>
            </button>
          ) : (
            <button
              onClick={() => endSession()}
              title="End and complete current session early"
              className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-extrabold text-sm shadow-lg shadow-rose-500/25 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Session</span>
            </button>
          )}

          {/* Reset / Abandon Controls */}
          {status !== 'IDLE' && (
            <button
              onClick={() => setShowAbandonConfirm(true)}
              title="Abandon session"
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}

          {/* Reset when idle */}
          {status === 'IDLE' && (
            <button
              onClick={resetTimer}
              title="Reset timer (R)"
              className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          {/* Skip session */}
          <button
            onClick={() => setShowSkipConfirm(true)}
            title="Skip to next session"
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Motivational Quote Banner */}
        <div className="mt-8 text-center max-w-md px-4 min-h-[48px] flex items-center justify-center">
          <div
            className={`transition-all duration-300 ease-out transform ${
              isQuoteTransitioning
                ? 'opacity-0 -translate-y-1 scale-[0.99] filter blur-[0.5px]'
                : 'opacity-100 translate-y-0 scale-100 filter blur-0'
            }`}
          >
            <p className="text-xs text-slate-400 italic">
              &ldquo;{quote.text}&rdquo;
            </p>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              &mdash; {quote.author}
            </p>
          </div>
        </div>
      </div>

      {/* Subject & Task Selection Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subject Selector */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-focus-400" />
            <span>Link to Subject</span>
          </label>
          <select
            value={selectedSubjectId || ''}
            onChange={(e) => setSelectedSubjectId(e.target.value || null)}
            disabled={status === 'RUNNING'}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-focus-500 disabled:opacity-50"
          >
            <option value="">General Study (No Subject)</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Task Selector */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <CheckSquare className="w-3.5 h-3.5 text-break-short" />
            <span>Link to Study Task</span>
          </label>
          <select
            value={selectedTaskId || ''}
            onChange={(e) => setSelectedTaskId(e.target.value || null)}
            disabled={status === 'RUNNING'}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-focus-500 disabled:opacity-50"
          >
            <option value="">No Linked Task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} ({task.completedSessions}/{task.estimatedSessions} Pomodoros)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Completion Dialog */}
      <Modal
        isOpen={showCompletionModal}
        onClose={closeCompletionModal}
        title={lastCompletedMode === 'FOCUS' ? 'Session Complete! 🎉' : 'Break Ended! ⏰'}
      >
        <div className="space-y-4 py-2">
          <div className="w-14 h-14 rounded-2xl bg-focus-500/10 border border-focus-500/30 flex items-center justify-center text-focus-400 mx-auto">
            {lastCompletedMode === 'FOCUS' ? (
              <Sparkles className="w-7 h-7" />
            ) : (
              <Coffee className="w-7 h-7 text-break-short" />
            )}
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm text-slate-300">
              {lastCompletedMode === 'FOCUS'
                ? 'Outstanding focus! Your study time has been recorded to your metrics.'
                : 'Break is over. Ready to jump back into focused work?'}
            </p>
            <p className="text-xs text-slate-400">
              {lastCompletedMode === 'FOCUS'
                ? cycleCount === 1
                  ? 'You completed a full cycle! Recommended: 15-minute Long Break.'
                  : 'Recommended: 5-minute Short Break.'
                : 'Next up: 25-minute Focused Work Session.'}
            </p>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              onClick={closeCompletionModal}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Take Later
            </button>
            <button
              onClick={proceedToNextSession}
              className="px-5 py-2.5 rounded-xl bg-focus-500 hover:bg-focus-600 text-white text-xs font-bold shadow-glow transition-all"
            >
              {lastCompletedMode === 'FOCUS' ? 'Start Break Now' : 'Start Focus Session'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Skip Confirmation Dialog */}
      <Modal
        isOpen={showSkipConfirm}
        onClose={() => setShowSkipConfirm(false)}
        title="Skip Current Session?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Skipping will advance to the next session mode without recording this interval as completed.
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowSkipConfirm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                setShowSkipConfirm(false);
                await skipSession();
              }}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold"
            >
              Confirm Skip
            </button>
          </div>
        </div>
      </Modal>

      {/* Abandon Confirmation Dialog */}
      <Modal
        isOpen={showAbandonConfirm}
        onClose={() => setShowAbandonConfirm(false)}
        title="Abandon Active Session?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            This will cancel the active timer and record it as abandoned. Your partial focused time will be preserved for auditing.
          </p>
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={() => setShowAbandonConfirm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Continue Studying
            </button>
            <button
              onClick={async () => {
                setShowAbandonConfirm(false);
                await abandonSession();
              }}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold"
            >
              Abandon Session
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
