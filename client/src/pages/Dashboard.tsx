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
  Square,
  X,
  ChevronDown,
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
    endSession,
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
  const [showAssignTaskModal, setShowAssignTaskModal] = useState<boolean>(false);
  const [newAssignTaskTitle, setNewAssignTaskTitle] = useState<string>('');
  const [newAssignTaskSubjectId, setNewAssignTaskSubjectId] = useState<string>('');

  // Sync tasks & daily stats from LocalStorage & Cloud API
  const refreshData = useCallback(async () => {
    // Local storage instant refresh
    const localTasks = LocalStorageRepository.getTasks();
    setTasks(localTasks);
    setDailySummary(LocalStorageRepository.getDailySummary());
    setRecentSessions(LocalStorageRepository.getSessions().slice(0, 5));

    // If authenticated with Google, fetch latest from server
    if (user) {
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

  const handleAssignTask = (task: StudyTask) => {
    setSelectedTaskId(task.id);
    if (task.subjectId) {
      setSelectedSubjectId(task.subjectId);
    }
    setShowAssignTaskModal(false);
  };

  const handleUnassignTask = () => {
    setSelectedTaskId(null);
    setShowAssignTaskModal(false);
  };

  const handleCreateAndAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignTaskTitle.trim()) return;

    const title = newAssignTaskTitle.trim();
    const subjectId = newAssignTaskSubjectId || selectedSubjectId || undefined;

    let createdId: string | null = null;
    if (user) {
      try {
        const res = await apiRequest<{ task: StudyTask }>('/api/tasks', {
          method: 'POST',
          body: JSON.stringify({
            title,
            subjectId,
            priority: 'MEDIUM',
            estimatedSessions: 2,
          }),
        });
        if (res?.task) {
          createdId = res.task.id;
        }
      } catch (err) {
        console.warn('Could not create task on server, falling back to local storage:', err);
      }
    }

    if (!createdId) {
      const created = LocalStorageRepository.addTask({
        title,
        subjectId,
        priority: 'MEDIUM',
        estimatedSessions: 2,
      });
      createdId = created.id;
    }

    setSelectedTaskId(createdId);
    if (subjectId) {
      setSelectedSubjectId(subjectId);
    }
    setNewAssignTaskTitle('');
    setNewAssignTaskSubjectId('');
    setShowAssignTaskModal(false);
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
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 1. HERO TIMER CARD (Center & Main Element with Claymorphism & Frosted Glass) */}
      <div className="clay-card p-4 xs:p-6 sm:p-10 relative overflow-hidden">
        {/* Ambient Glowing Aura matching active mode */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[460px] h-[320px] sm:h-[460px] rounded-full blur-[100px] sm:blur-[130px] pointer-events-none opacity-25 transition-colors duration-700 -z-10 ${
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
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-white/[0.08]">
          {/* Tactile Recessed Mode Switcher */}
          <div className="flex items-center p-1 sm:p-1.5 rounded-2xl clay-inset max-w-full overflow-x-auto no-scrollbar">
            {modes.map((m) => {
              const isActive = mode === m.id;
              let activeClass = 'clay-btn-focus shadow-lg shadow-blue-500/25';
              if (m.id === 'SHORT_BREAK') activeClass = 'clay-btn-break shadow-lg shadow-emerald-500/25';
              if (m.id === 'LONG_BREAK') activeClass = 'clay-btn-violet shadow-lg shadow-violet-500/25';
              if (m.id === 'STOPWATCH') activeClass = 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25';

              return (
                <button
                  key={m.id}
                  onClick={() => switchMode(m.id)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? `clay-btn ${activeClass}`
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Preset Chips (Only for countdown modes) */}
          {mode !== 'STOPWATCH' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 no-scrollbar">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 hidden sm:inline uppercase tracking-wider">
                Presets:
              </span>
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  title={p.desc}
                  className={`clay-chip px-2.5 sm:px-3 py-1.5 text-[11px] font-mono font-bold whitespace-nowrap transition-all ${
                    activePreset === p.id
                      ? 'border border-blue-400/50 bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/20'
                      : 'border border-white/[0.08] bg-slate-900/60 text-slate-400 hover:text-white hover:border-white/[0.15]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject & Task Selector Header */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 sm:pt-6 pb-2">
          {/* Subject Dropdown */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-blue-400" />
              <span>Subject:</span>
            </span>
            <select
              value={selectedSubjectId || ''}
              onChange={(e) => setSelectedSubjectId(e.target.value || null)}
              className="clay-inset-sm text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2 w-full sm:w-auto focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 flex-shrink-0">
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Task:</span>
            </span>
            <select
              value={selectedTaskId || ''}
              onChange={(e) => setSelectedTaskId(e.target.value || null)}
              className="clay-inset-sm text-xs font-semibold text-slate-200 rounded-xl px-3.5 py-2 flex-1 sm:flex-initial sm:max-w-[200px] truncate focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
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
              className="clay-chip p-2 bg-slate-900/80 text-slate-300 hover:text-white border border-white/[0.08] flex-shrink-0"
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
              className="flex-1 clay-inset rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
              autoFocus
            />
            <button
              type="submit"
              className="clay-btn clay-btn-focus px-4 py-2 text-xs font-bold flex-shrink-0"
            >
              Set Task
            </button>
          </form>
        )}

        {/* 2. THE CIRCULAR PROGRESS TIMER DISPLAY (Tactile Clay Dial & Glow Arc) */}
        <div className="relative z-10 flex flex-col items-center justify-center my-4 sm:my-10">
          <div className="relative w-[260px] h-[260px] xs:w-[280px] xs:h-[280px] sm:w-[320px] sm:h-[320px] max-w-full aspect-square flex items-center justify-center">
            {/* Volumetric Clay Dial Backplate */}
            <div className="absolute inset-2 clay-timer-dial pointer-events-none" />

            {/* SVG Progress Ring */}
            <svg className="w-full h-full -rotate-90 transform relative z-10" viewBox="0 0 300 300">
              {/* Outer Track Ring */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                className="stroke-slate-800/60"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Ring with Glow Filter */}
              <circle
                cx="150"
                cy="150"
                r={radius}
                stroke={
                  mode === 'FOCUS'
                    ? '#4E75FF'
                    : mode === 'SHORT_BREAK'
                    ? '#10B981'
                    : mode === 'LONG_BREAK'
                    ? '#8B5CF6'
                    : '#06B6D4'
                }
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={mode === 'STOPWATCH' ? 0 : strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 0.35s ease-out, stroke 0.3s ease',
                  filter: `drop-shadow(0 0 8px ${
                    mode === 'FOCUS'
                      ? 'rgba(78, 117, 255, 0.6)'
                      : mode === 'SHORT_BREAK'
                      ? 'rgba(16, 185, 129, 0.6)'
                      : mode === 'LONG_BREAK'
                      ? 'rgba(139, 92, 246, 0.6)'
                      : 'rgba(6, 182, 212, 0.6)'
                  })`,
                }}
              />
            </svg>

            {/* Inner Content Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 sm:p-6 select-none z-20">
              {/* Session Type Pill */}
              <div
                className={`clay-chip inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest mb-1 sm:mb-2 border ${
                  mode === 'FOCUS'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-400/30'
                    : mode === 'SHORT_BREAK'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                    : mode === 'LONG_BREAK'
                    ? 'bg-violet-500/15 text-violet-300 border-violet-400/30'
                    : 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
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

              {/* Countdown Digits with tactile glow */}
              <span className="text-4xl xs:text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#F8FAFC] font-mono tracking-tight my-0.5 sm:my-1 tabular-nums drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)]">
                {formatTime(secondsRemaining)}
              </span>

              {/* Active Subject & Task Context Label */}
              <div className="mt-0.5 sm:mt-1 max-w-[180px] sm:max-w-[220px] truncate">
                {activeTask ? (
                  <p className="text-xs font-bold text-slate-200 truncate">{activeTask.title}</p>
                ) : activeSubject ? (
                  <p className="text-xs font-bold truncate" style={{ color: activeSubject.color }}>
                    {activeSubject.name}
                  </p>
                ) : (
                  <p className="text-xs font-medium text-slate-400">Deep Academic Study</p>
                )}
              </div>

              {/* Cycle indicator dots (4 sessions per long break) */}
              {mode === 'FOCUS' && (
                <div className="flex items-center space-x-1.5 sm:space-x-2 mt-2 sm:mt-3">
                  {[1, 2, 3, 4].map((c) => (
                    <span
                      key={c}
                      className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                        c < cycleCount
                          ? 'bg-blue-400 ring-2 ring-blue-500/40 shadow-sm shadow-blue-500/50'
                          : c === cycleCount && status === 'RUNNING'
                          ? 'bg-blue-300 animate-pulse ring-4 ring-blue-500/30'
                          : 'bg-slate-800 border border-white/[0.08]'
                      }`}
                    />
                  ))}
                  <span className="text-[10px] font-bold text-slate-400 ml-1">Cycle {cycleCount}/4</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3. PRIMARY CONTROLS BAR (Tactile Clay Buttons) */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3.5 pt-2 w-full">
          {/* Main Action Button (Start / Pause / Resume) */}
          {status === 'IDLE' && (
            <button
              onClick={startTimer}
              className="clay-btn clay-btn-focus flex items-center justify-center space-x-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base flex-1 sm:flex-initial min-w-[140px] shadow-xl"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Session</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md text-white font-mono font-bold hidden xs:inline">
                Space
              </span>
            </button>
          )}

          {status === 'RUNNING' && (
            <button
              onClick={pauseTimer}
              className="clay-btn clay-btn-amber flex items-center justify-center space-x-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base flex-1 sm:flex-initial min-w-[140px] shadow-xl"
            >
              <Pause className="w-5 h-5 fill-current" />
              <span>Pause</span>
              <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-md text-slate-950 font-mono font-bold hidden xs:inline">
                Space
              </span>
            </button>
          )}

          {status === 'PAUSED' && (
            <button
              onClick={resumeTimer}
              className="clay-btn clay-btn-focus flex items-center justify-center space-x-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base flex-1 sm:flex-initial min-w-[140px] shadow-xl"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Resume</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md text-white font-mono font-bold hidden xs:inline">
                Space
              </span>
            </button>
          )}

          {/* End Session Button (Right beside Start Session / Pause / Resume) */}
          {status === 'IDLE' ? (
            <button
              disabled
              title="Start a session first before ending it"
              className="clay-chip flex items-center justify-center space-x-2 px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base bg-slate-900/40 text-slate-600 border border-white/[0.04] cursor-not-allowed opacity-50 select-none flex-1 sm:flex-initial min-w-[130px]"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Session</span>
            </button>
          ) : (
            <button
              onClick={() => endSession()}
              title="End session early and record your focus progress"
              className="clay-btn bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 hover:from-rose-600 hover:to-red-700 text-white flex items-center justify-center space-x-2 px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl text-sm sm:text-base shadow-xl shadow-rose-500/25 border-t border-rose-300/30 transition-all active:scale-95 flex-1 sm:flex-initial min-w-[130px]"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>End Session</span>
            </button>
          )}

          {/* Assign Task Button (Right beside End Session) */}
          {activeTask ? (
            <button
              onClick={() => setShowAssignTaskModal(true)}
              className="clay-chip flex items-center justify-between sm:justify-start space-x-2.5 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold bg-blue-500/15 hover:bg-blue-500/25 text-blue-200 border border-blue-400/40 shadow-lg shadow-blue-500/15 transition-all w-full sm:w-auto max-w-full sm:max-w-[260px] group"
              title={`Assigned Task: "${activeTask.title}". Click to switch or unassign.`}
            >
              <div className="flex items-center space-x-2 min-w-0">
                <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <div className="flex flex-col text-left min-w-0">
                  <span className="text-[9px] text-blue-300 font-semibold uppercase tracking-wider leading-none">Task</span>
                  <span className="truncate text-xs text-white font-bold">{activeTask.title}</span>
                </div>
              </div>
              <span className="text-[10px] bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded-md font-mono font-bold flex-shrink-0 ml-1">
                {activeTask.completedSessions}/{activeTask.estimatedSessions}🍅
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowAssignTaskModal(true)}
              className="clay-btn bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-center space-x-2 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl text-xs sm:text-sm font-bold border border-white/[0.08] hover:border-blue-500/40 shadow-xl transition-all active:scale-95 group w-full sm:w-auto"
              title="Assign a study task to this focus session"
            >
              <Target className="w-4 h-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
              <span>Assign Task</span>
              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-md font-bold">
                +
              </span>
            </button>
          )}

          {/* Quick Utility Control Toolbar on mobile */}
          <div className="flex items-center justify-center gap-2 sm:gap-2.5 w-full sm:w-auto mt-1 sm:mt-0">
            {/* Reset Control */}
            <button
              onClick={resetTimer}
              title="Reset timer [R]"
              disabled={status === 'IDLE'}
              className={`clay-chip p-3 sm:p-3.5 transition-all ${
                status !== 'IDLE'
                  ? 'bg-slate-900/80 text-slate-300 hover:text-white border border-white/[0.08]'
                  : 'bg-slate-900/40 text-slate-600 border border-white/[0.04] cursor-not-allowed opacity-50'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Skip Control */}
            <button
              onClick={skipSession}
              title="Skip to next session"
              className="clay-chip p-3 sm:p-3.5 bg-slate-900/80 text-slate-300 hover:text-white border border-white/[0.08] transition-all"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Picture in Picture Mini-Timer */}
            <button
              onClick={togglePiP}
              title={isPiPActive ? 'Exit Picture-in-Picture' : 'Open Picture-in-Picture Mini Timer'}
              className={`clay-chip p-3 sm:p-3.5 transition-all ${
                isPiPActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-400/40 shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border border-white/[0.08]'
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
                className={`clay-chip p-3 sm:p-3.5 transition-all flex items-center gap-1.5 ${
                  isRainPlaying
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-400/40 shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/[0.08]'
                }`}
              >
                <CloudRain className="w-4 h-4" />
                {isRainPlaying && <span className="text-[10px] font-bold text-blue-300 hidden md:inline">Rain</span>}
              </button>

              {/* Quick volume slider popover */}
              {isRainPlaying && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 p-3.5 clay-card flex items-center space-x-2.5 z-30 shadow-2xl">
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
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
      </div>

      {/* 4. DAILY FOCUS SUMMARY BAR (Tactile Clay Metric Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Focused Time */}
        <div className="clay-card clay-card-interactive p-4 sm:p-5 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Focused Today</p>
            <p className="text-xl font-extrabold text-white">
              {Math.floor(dailySummary.focusedMinutes / 60) > 0
                ? `${Math.floor(dailySummary.focusedMinutes / 60)}h ${dailySummary.focusedMinutes % 60}m`
                : `${dailySummary.focusedMinutes}m`}
            </p>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="clay-card clay-card-interactive p-4 sm:p-5 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Completed</p>
            <p className="text-xl font-extrabold text-white">
              {dailySummary.completedSessions} <span className="text-xs font-semibold text-slate-400">Sessions</span>
            </p>
          </div>
        </div>

        {/* Current Streak */}
        <div className="clay-card clay-card-interactive p-4 sm:p-5 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-inner flex-shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Streak</p>
            <p className="text-xl font-extrabold text-white">
              {dailySummary.currentStreak} <span className="text-xs font-semibold text-slate-400">Days</span>
            </p>
          </div>
        </div>

        {/* Goal Progress */}
        <div className="clay-card clay-card-interactive p-4 sm:p-5 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-400 shadow-inner flex-shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Daily Goal</p>
              <span className="text-xs font-extrabold text-violet-400">{dailySummary.goalProgressPercentage}%</span>
            </div>
            <div className="w-full clay-inset-sm rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-violet-500 to-indigo-400 h-2 rounded-full transition-all duration-500 shadow-sm shadow-violet-500/50"
                style={{ width: `${dailySummary.goalProgressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECONDARY CARDS: ACTIVE STUDY TASKS & RECENT HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Tasks */}
        <div className="lg:col-span-7 clay-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-extrabold text-white">Focus Tasks</h2>
            </div>
            <button
              onClick={() => onNavigate('tasks')}
              className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
            >
              <span>Manage All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {tasks.filter((t) => !t.isCompleted).slice(0, 4).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No active tasks right now. Create one above!</p>
            ) : (
              tasks
                .filter((t) => !t.isCompleted)
                .slice(0, 4)
                .map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                      selectedTaskId === task.id
                        ? 'border border-blue-400/50 bg-blue-500/15 shadow-md shadow-blue-500/15'
                        : 'clay-inset-sm hover:border-white/[0.15]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="w-5 h-5 rounded-lg border border-slate-600 hover:border-blue-400 flex items-center justify-center flex-shrink-0 transition-colors bg-slate-900/60"
                      >
                        {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </button>
                      <button
                        onClick={() => setSelectedTaskId(task.id)}
                        className="text-left text-xs text-slate-200 hover:text-white truncate font-semibold"
                      >
                        {task.title}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                      {task.subject && (
                        <span
                          className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold"
                          style={{
                            backgroundColor: `${task.subject.color}20`,
                            color: task.subject.color,
                            border: `1px solid ${task.subject.color}40`,
                          }}
                        >
                          {task.subject.name}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono font-semibold">
                        {task.completedSessions}/{task.estimatedSessions} 🍅
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right: Recent Completed Sessions */}
        <div className="lg:col-span-5 clay-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-extrabold text-white">Recent Sessions</h2>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-slate-400 hover:text-slate-200 font-bold flex items-center gap-1 transition-colors"
            >
              <span>History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentSessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Your completed study sessions will appear here.</p>
            ) : (
              recentSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl clay-inset-sm text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-200 truncate">
                      {session.task?.title || session.subject?.name || 'Focused Study'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                      {session.endedAt
                        ? new Date(session.endedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-extrabold text-blue-400">
                    +{Math.round(session.actualDuration / 60)} min
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. ASSIGN TASK MODAL DIALOG */}
      {showAssignTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 xs:p-4 bg-black/75 backdrop-blur-md">
          <div className="clay-card w-full max-w-lg p-4 xs:p-6 sm:p-7 relative border border-white/[0.12] shadow-2xl max-h-[92dvh] overflow-y-auto no-scrollbar flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 xs:pb-4 border-b border-white/[0.08]">
              <div className="flex items-center space-x-2.5 xs:space-x-3">
                <div className="w-9 h-9 xs:w-10 xs:h-10 rounded-2xl bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                  <Target className="w-4 h-4 xs:w-5 xs:h-5" />
                </div>
                <div>
                  <h3 className="text-sm xs:text-base font-extrabold text-white">Assign Task to Session</h3>
                  <p className="text-[11px] xs:text-xs text-slate-400 mt-0.5">
                    Link your focus time to a specific task and track progress
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignTaskModal(false)}
                className="clay-chip p-2 text-slate-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently Assigned Task Banner (if any) */}
            {activeTask && (
              <div className="mt-3 xs:mt-4 p-3 xs:p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 xs:space-x-2.5 min-w-0">
                  <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
                      Currently Assigned
                    </span>
                    <span className="text-xs font-bold text-white truncate block">
                      {activeTask.title}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleUnassignTask}
                  className="px-2.5 xs:px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all flex-shrink-0"
                >
                  Unassign
                </button>
              </div>
            )}

            {/* Quick Add New Task Section */}
            <form onSubmit={handleCreateAndAssignTask} className="mt-3 xs:mt-4 space-y-2 xs:space-y-2.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Create &amp; Assign New Task</span>
                <span className="text-[10px] text-slate-400 font-normal">Press enter to save</span>
              </label>
              <div className="flex flex-col xs:flex-row gap-2">
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Exercises, Research Paper..."
                  value={newAssignTaskTitle}
                  onChange={(e) => setNewAssignTaskTitle(e.target.value)}
                  className="w-full xs:flex-1 min-w-0 clay-inset rounded-xl px-3.5 py-2 xs:py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={!newAssignTaskTitle.trim()}
                  className="clay-btn clay-btn-focus px-4 py-2 xs:py-2.5 text-xs font-bold flex items-center justify-center space-x-1.5 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Assign</span>
                </button>
              </div>

              {subjects.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400">Subject:</span>
                  <select
                    value={newAssignTaskSubjectId}
                    onChange={(e) => setNewAssignTaskSubjectId(e.target.value)}
                    className="clay-inset-sm text-[11px] font-semibold text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-400 cursor-pointer"
                  >
                    <option value="">No Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </form>

            {/* Existing Active Tasks List */}
            <div className="mt-5 flex-1 overflow-y-auto pr-1 space-y-2 max-h-[260px]">
              <p className="text-xs font-bold text-slate-300 mb-2">Or Choose from Active Tasks</p>
              {tasks.filter((t) => !t.isCompleted).length === 0 ? (
                <div className="text-center py-6 clay-inset-sm rounded-2xl">
                  <p className="text-xs text-slate-400">No active tasks found.</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Type a task above to create your first one!
                  </p>
                </div>
              ) : (
                tasks
                  .filter((t) => !t.isCompleted)
                  .map((task) => {
                    const isSelected = selectedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleAssignTask(task)}
                        className={`p-3.5 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${
                          isSelected
                            ? 'bg-blue-500/20 border border-blue-400/50 shadow-md shadow-blue-500/20'
                            : 'clay-inset-sm hover:border-white/[0.15] hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? 'bg-blue-500 text-white'
                                : 'border border-slate-600 group-hover:border-blue-400 text-transparent'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold truncate ${
                                isSelected ? 'text-white' : 'text-slate-200 group-hover:text-white'
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {task.subject && (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.2 rounded-md"
                                  style={{
                                    backgroundColor: `${task.subject.color}20`,
                                    color: task.subject.color,
                                  }}
                                >
                                  {task.subject.name}
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {task.completedSessions}/{task.estimatedSessions} sessions
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                          {isSelected ? (
                            <span className="text-[10px] font-bold text-blue-300 bg-blue-500/30 px-2.5 py-1 rounded-lg">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-300 group-hover:bg-blue-500/20 px-2.5 py-1 rounded-lg transition-all">
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between">
              <button
                onClick={() => {
                  setShowAssignTaskModal(false);
                  onNavigate('tasks');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 transition-colors"
              >
                <span>Manage All Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowAssignTaskModal(false)}
                className="clay-chip px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
