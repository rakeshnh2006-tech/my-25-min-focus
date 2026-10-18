import React, { useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CloudRain,
  Volume2,
  VolumeX,
  PictureInPicture2,
  Flame,
  Clock,
  CheckCircle2,
  Target,
  BookOpen,
  CheckSquare,
  Sparkles,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useAuth } from '../context/AuthContext';
import { LocalStorageRepository } from '../lib/storage';
import { apiRequest } from '../lib/api';
import { StudyTask, FocusSession, TimerPreset, TimerMode, DailyFocusSummary } from '../types';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    status,
    mode,
    secondsRemaining,
    totalDuration,
    cycleCount,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipSession,
    switchMode,
    applyPreset,
    activePreset,
    selectedSubjectId,
    setSelectedSubjectId,
    selectedTaskId,
    setSelectedTaskId,
    isRainPlaying,
    rainVolume,
    toggleRain,
    setRainVolume,
    togglePiP,
    isPiPActive,
  } = useTimer();

  const { user, subjects, preference } = useAuth();

  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyFocusSummary>(() =>
    LocalStorageRepository.getDailySummary()
  );
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>(() =>
    LocalStorageRepository.getSessions().slice(0, 5)
  );
  const [showRainSlider, setShowRainSlider] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [showQuickAddTask, setShowQuickAddTask] = useState<boolean>(false);

  // Sync tasks & daily stats from LocalStorage & Cloud API
  const refreshData = useCallback(async () => {
    // Local storage instant refresh
    const localTasks = LocalStorageRepository.getTasks();
    setTasks(localTasks);
    setDailySummary(LocalStorageRepository.getDailySummary());
    setRecentSessions(LocalStorageRepository.getSessions().slice(0, 5));

    // If cloud authenticated, fetch latest
    if (user && !user.isGuest) {
      try {
        const [taskRes, dashRes] = await Promise.all([
          apiRequest<{ tasks: StudyTask[] }>('/api/tasks?filter=active'),
          apiRequest<any>('/api/dashboard/summary'),
        ]);
        if (taskRes?.tasks) {
          setTasks(taskRes.tasks);
          LocalStorageRepository.saveTasks(taskRes.tasks);
        }
        if (dashRes?.today) {
          setDailySummary({
            focusedMinutes: dashRes.today.focusedMinutes || 0,
            completedSessions: dashRes.today.completedPomodoros || 0,
            currentStreak: dashRes.streak?.currentStreak || 0,
            longestStreak: dashRes.streak?.longestStreak || 0,
            dailyGoalMinutes: dashRes.today.dailyGoalMinutes || 120,
            goalProgressPercentage: dashRes.today.goalProgressPercentage || 0,
          });
        }
      } catch {
        // use local
      }
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData, status]);

  // Keyboard shortcut listeners (Space for play/pause, R for reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'RUNNING') pauseTimer();
        else if (status === 'PAUSED') resumeTimer();
        else if (status === 'IDLE') startTimer();
      } else if (e.key === 'r' || e.key === 'R') {
        if (status === 'IDLE' || status === 'PAUSED') resetTimer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, pauseTimer, resumeTimer, startTimer, resetTimer]);

  const handleToggleTask = (task: StudyTask) => {
    LocalStorageRepository.toggleTask(task.id);
    refreshData();
  };

  const handleQuickAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const created = LocalStorageRepository.addTask({
      title: newTaskTitle.trim(),
      subjectId: selectedSubjectId || undefined,
      priority: 'MEDIUM',
      estimatedSessions: 2,
    });
    setNewTaskTitle('');
    setShowQuickAddTask(false);
    setSelectedTaskId(created.id);
    refreshData();
  };

  // Time formatter (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Circular SVG progress math
  const radius = 135;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDuration > 0 ? (totalDuration - secondsRemaining) / totalDuration : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  // Selected entities for display
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  const activeTask = tasks.find((t) => t.id === selectedTaskId);

  const presets: { id: TimerPreset; label: string; desc: string }[] = [
    { id: '25/5', label: '25 / 5', desc: 'Classic' },
    { id: '50/10', label: '50 / 10', desc: 'Deep Work' },
    { id: '60/10', label: '60 / 10', desc: 'Power Hour' },
    { id: '90/20', label: '90 / 20', desc: 'Ultradian' },
  ];

  const modes: { id: TimerMode; label: string }[] = [
    { id: 'FOCUS', label: 'Focus' },
    { id: 'SHORT_BREAK', label: 'Short Break' },
    { id: 'LONG_BREAK', label: 'Long Break' },
    { id: 'STOPWATCH', label: 'Stopwatch' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. HERO TIMER CARD (Center & Main Element) */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-card relative overflow-hidden">
        {/* Subtle background glow matching mode */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-500 ${
            mode === 'FOCUS'
              ? 'bg-blue-500'
              : mode === 'SHORT_BREAK'
              ? 'bg-emerald-500'
              : mode === 'LONG_BREAK'
              ? 'bg-violet-600'
              : 'bg-cyan-500'
          }`}
        />

        {/* Top Controls: Mode Switcher & Presets */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#080D1A] border border-slate-800">
            {modes.map((m) => (
              <button
                key={m.id}
                onClick={() => switchMode(m.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  mode === m.id
                    ? m.id === 'FOCUS'
                      ? 'bg-focus-500 text-white shadow-sm'
                      : m.id === 'SHORT_BREAK'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : m.id === 'LONG_BREAK'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-cyan-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Preset Chips (Only for countdown modes) */}
          {mode !== 'STOPWATCH' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-slate-500 font-medium mr-1 hidden sm:inline">Presets:</span>
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  title={p.desc}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-all ${
                    activePreset === p.id
                      ? 'border-focus-500 bg-focus-500/15 text-focus-400 font-bold'
                      : 'border-slate-800 bg-[#080D1A] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject & Task Selector Header */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-6 pb-2">
          {/* Subject Dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Subject:</span>
            </span>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value || null)}
              className="bg-[#080D1A] border border-slate-800 text-xs font-medium text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-focus-500"
            >
              <option value="">General Study (No Subject)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Dropdown & Quick Add */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>Task:</span>
            </span>
            <select
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(e.target.value || null)}
              className="bg-[#080D1A] border border-slate-800 text-xs font-medium text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-focus-500 max-w-[200px] truncate"
            >
              <option value="">None Selected</option>
              {tasks
                .filter((t) => !t.isCompleted)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
            <button
              onClick={() => setShowQuickAddTask(!showQuickAddTask)}
              title="Add task quickly"
              className="p-1.5 rounded-lg bg-[#080D1A] border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Add Task Input (Collapsible) */}
        {showQuickAddTask && (
          <form onSubmit={handleQuickAddTask} className="relative z-10 flex items-center gap-2 mt-2 pt-2">
            <input
              type="text"
              placeholder="What are you working on right now?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-[#080D1A] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-focus-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-focus-500 text-white text-xs font-semibold hover:bg-focus-600 transition-colors"
            >
              Set Task
            </button>
          </form>
        )}

        {/* 2. THE CIRCULAR PROGRESS TIMER DISPLAY */}
        <div className="relative z-10 flex flex-col items-center justify-center my-6 sm:my-10">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 300 300">
              {/* Outer Track Ring */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                className="stroke-slate-800/80"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                stroke={
                  mode === 'FOCUS'
                    ? '#4F7CFF'
                    : mode === 'SHORT_BREAK'
                    ? '#10B981'
                    : mode === 'LONG_BREAK'
                    ? '#7C3AED'
                    : '#38BDF8'
                }
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={mode === 'STOPWATCH' ? 0 : strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.35s ease-out, stroke 0.3s ease',
                }}
              />
            </svg>

            {/* Inner Content Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 select-none">
              {/* Session Type Pill */}
              <div
                className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border ${
                  mode === 'FOCUS'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : mode === 'SHORT_BREAK'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : mode === 'LONG_BREAK'
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                }`}
              >
                <span>
                  {mode === 'FOCUS'
                    ? 'Focus Interval'
                    : mode === 'SHORT_BREAK'
                    ? 'Short Break'
                    : mode === 'LONG_BREAK'
                    ? 'Long Break'
                    : 'Open Stopwatch'}
                </span>
              </div>

              {/* Countdown Digits */}
              <span className="text-5xl sm:text-6xl font-extrabold text-[#F8FAFC] font-mono tracking-tight my-1 tabular-nums">
                {formatTime(secondsRemaining)}
              </span>

              {/* Active Subject & Task Context Label */}
              <div className="mt-1 max-w-[200px] truncate">
                {activeTask ? (
                  <p className="text-xs font-semibold text-slate-300 truncate">{activeTask.title}</p>
                ) : activeSubject ? (
                  <p className="text-xs font-semibold text-slate-300 truncate" style={{ color: activeSubject.color }}>
                    {activeSubject.name}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Deep Academic Study</p>
                )}
              </div>

              {/* Cycle indicator dots (4 sessions per long break) */}
              {mode === 'FOCUS' && (
                <div className="flex items-center space-x-1.5 mt-3">
                  {[1, 2, 3, 4].map((c) => (
                    <span
                      key={c}
                      className={`w-2 h-2 rounded-full transition-all ${
                        c < cycleCount
                          ? 'bg-focus-500 ring-2 ring-focus-500/30'
                          : c === cycleCount && status === 'RUNNING'
                          ? 'bg-focus-400 animate-pulse'
                          : 'bg-slate-800'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] text-slate-500 ml-1">Cycle {cycleCount}/4</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. PRIMARY CONTROLS BAR */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
          {/* Main Action Button (Start / Pause / Resume) */}
          {status === 'IDLE' && (
            <button
              onClick={startTimer}
              className="flex items-center space-x-2.5 px-8 py-3.5 rounded-2xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Session</span>
              <span className="text-[10px] bg-focus-700/60 px-1.5 py-0.5 rounded text-focus-200 font-mono">
                Space
              </span>
            </button>
          )}

          {status === 'RUNNING' && (
            <button
              onClick={pauseTimer}
              className="flex items-center space-x-2.5 px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause</span>
              <span className="text-[10px] bg-amber-600/60 px-1.5 py-0.5 rounded text-amber-950 font-mono">
                Space
              </span>
            </button>
          )}

          {status === 'PAUSED' && (
            <button
              onClick={resumeTimer}
              className="flex items-center space-x-2.5 px-8 py-3.5 rounded-2xl bg-focus-500 hover:bg-focus-600 text-white font-bold text-sm shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Resume</span>
              <span className="text-[10px] bg-focus-700/60 px-1.5 py-0.5 rounded text-focus-200 font-mono">
                Space
              </span>
            </button>
          )}

          {/* Reset Control */}
          <button
            onClick={resetTimer}
            title="Reset timer [R]"
            disabled={status === 'IDLE'}
            className={`p-3.5 rounded-2xl border transition-all ${
              status !== 'IDLE'
                ? 'border-slate-800 bg-[#080D1A] text-slate-300 hover:text-white hover:border-slate-700'
                : 'border-slate-800/50 bg-[#080D1A]/50 text-slate-600 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Skip Control */}
          <button
            onClick={skipSession}
            title="Skip to next session"
            className="p-3.5 rounded-2xl border border-slate-800 bg-[#080D1A] text-slate-300 hover:text-white hover:border-slate-700 transition-all"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Picture in Picture Mini-Timer */}
          <button
            onClick={togglePiP}
            title={isPiPActive ? 'Exit Picture-in-Picture' : 'Open Picture-in-Picture Mini Timer'}
            className={`p-3.5 rounded-2xl border transition-all ${
              isPiPActive
                ? 'border-focus-500 bg-focus-500/20 text-focus-400'
                : 'border-slate-800 bg-[#080D1A] text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>

          {/* Ambient Rain Sound Toggle & Volume */}
          <div className="relative">
            <button
              onClick={() => {
                toggleRain();
                setShowRainSlider(true);
              }}
              title={isRainPlaying ? 'Rain sound playing (click to toggle)' : 'Play ambient rain sound'}
              className={`p-3.5 rounded-2xl border transition-all flex items-center gap-1.5 ${
                isRainPlaying
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-sm'
                  : 'border-slate-800 bg-[#080D1A] text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <CloudRain className="w-4 h-4" />
              {isRainPlaying && <span className="text-[10px] font-semibold text-blue-300 hidden sm:inline">Rain</span>}
            </button>

            {/* Quick volume slider popover */}
            {isRainPlaying && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-[#080D1A] border border-slate-800 rounded-xl shadow-xl flex items-center space-x-2 z-20">
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={rainVolume}
                  onChange={(e) => setRainVolume(parseFloat(e.target.value))}
                  className="w-20 accent-blue-500 cursor-pointer"
                />
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. VISUALLY QUIETER DAILY FOCUS SUMMARY BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Focused Time */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Focused Today</p>
            <p className="text-lg font-bold text-white">
              {Math.floor(dailySummary.focusedMinutes / 60) > 0
                ? `${Math.floor(dailySummary.focusedMinutes / 60)}h ${dailySummary.focusedMinutes % 60}m`
                : `${dailySummary.focusedMinutes}m`}
            </p>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Completed</p>
            <p className="text-lg font-bold text-white">
              {dailySummary.completedSessions} <span className="text-xs font-normal text-slate-400">Sessions</span>
            </p>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Streak</p>
            <p className="text-lg font-bold text-white">
              {dailySummary.currentStreak} <span className="text-xs font-normal text-slate-400">Days</span>
            </p>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase font-semibold text-slate-500">Daily Goal</p>
              <span className="text-xs font-bold text-violet-400">{dailySummary.goalProgressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-violet-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${dailySummary.goalProgressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECONDARY CARDS: ACTIVE STUDY TASKS & RECENT HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Tasks */}
        <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-focus-400" />
              <h2 className="text-sm font-bold text-white">Focus Tasks</h2>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-focus-400 hover:text-focus-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.filter((t) => !t.isCompleted).slice(0, 4).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">No active tasks right now. Create one above!</p>
            ) : (
              tasks
                .filter((t) => !t.isCompleted)
                .slice(0, 4)
                .map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      selectedTaskId === task.id
                        ? 'border-focus-500/40 bg-focus-500/10'
                        : 'border-slate-800/80 bg-[#080D1A]/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="w-4 h-4 rounded border border-slate-600 hover:border-focus-400 flex items-center justify-center flex-shrink-0 transition-colors"
                      >
                        {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </button>
                      <button
                        onClick={() => setSelectedTaskId(task.id)}
                        className="text-left text-xs text-slate-200 hover:text-white truncate font-medium"
                      >
                        {task.title}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                      {task.subject && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${task.subject.color}15`,
                            color: task.subject.color,
                            border: `1px solid ${task.subject.color}30`,
                          }}
                        >
                          {task.subject.name}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono">
                        {task.completedSessions}/{task.estimatedSessions} 🍅
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right: Recent Completed Sessions */}
        <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Recent Sessions</h2>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition-colors"
            >
              <span>History</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentSessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Your completed study sessions will appear here.</p>
            ) : (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#080D1A]/60 border border-slate-800/80 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate">
                      {session.task?.title || session.subject?.name || 'Focused Study'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {session.endedAt
                        ? new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-focus-400">
                    +{Math.round(session.actualDuration / 60)} min
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
