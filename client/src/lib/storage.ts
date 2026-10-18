import { StudyTask, Subject, FocusSession, UserPreference, DailyFocusSummary, TimerPreset } from '../types';

const STORAGE_KEYS = {
  TASKS: 'cognify_tasks',
  SUBJECTS: 'cognify_subjects',
  SESSIONS: 'cognify_sessions',
  PREFERENCES: 'cognify_preferences',
  ACTIVE_SESSION: 'cognify_active_session',
  ACTIVE_TIMER_STATE: 'cognify_active_timer_state',
};

export interface ActiveTimerSnapshot {
  sessionId?: string | null;
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK' | 'STOPWATCH';
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';
  totalDuration: number;
  secondsRemaining: number;
  targetEndMs: number | null;
  pauseStartMs: number | null;
  remainingAtPause: number | null;
  stopwatchStartMs: number | null;
  startedAtMs: number;
  totalPausedMs: number;
  selectedSubjectId: string | null;
  selectedTaskId: string | null;
  cycleCount: number;
  activePreset: TimerPreset;
  updatedAtMs: number;
}

// --- TIMEZONE-AWARE DATE HELPERS ---
export function formatDateInTimezone(dateInput: Date | string, timezone: string = 'UTC'): string {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return d.toISOString().split('T')[0];
  }
}

export function getShiftedDateKey(referenceDate: Date, dayOffset: number, timezone: string = 'UTC'): string {
  const d = new Date(referenceDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  return formatDateInTimezone(d, timezone);
}

const DEFAULT_PREFERENCES: UserPreference = {
  id: 'local_pref',
  userId: 'user',
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  dailyGoalMinutes: 120,
  soundEnabled: true,
  notificationsEnabled: false,
  theme: 'dark',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  hasCompletedOnboarding: true,
  ambientSound: 'none',
  ambientVolume: 0.5,
  activePreset: '25/5',
};

const DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'sub_cs',
    name: 'Computer Science',
    description: 'Algorithms, Data Structures & System Design',
    color: '#4F7CFF', // Electric blue
    weeklyGoalMinutes: 300,
    taskCount: 2,
    completedSessionsCount: 4,
    totalFocusMinutes: 100,
  },
  {
    id: 'sub_math',
    name: 'Mathematics',
    description: 'Calculus, Linear Algebra & Probability',
    color: '#10B981', // Emerald
    weeklyGoalMinutes: 240,
    taskCount: 1,
    completedSessionsCount: 2,
    totalFocusMinutes: 50,
  },
  {
    id: 'sub_lit',
    name: 'Literature & Philosophy',
    description: 'Critical Reading & Essay Writing',
    color: '#7C3AED', // Subtle violet
    weeklyGoalMinutes: 180,
    taskCount: 1,
    completedSessionsCount: 1,
    totalFocusMinutes: 25,
  },
];

const DEFAULT_TASKS: StudyTask[] = [
  {
    id: 'task_1',
    subjectId: 'sub_cs',
    title: 'Review Graph Traversal & Dijkstra Algorithm',
    description: 'Implement shortest path algorithm and solve 2 LeetCode problems',
    priority: 'HIGH',
    estimatedSessions: 3,
    completedSessions: 1,
    isCompleted: false,
    subject: {
      id: 'sub_cs',
      name: 'Computer Science',
      color: '#4F7CFF',
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task_2',
    subjectId: 'sub_math',
    title: 'Multivariable Integration Practice Problems',
    description: 'Chapter 14 Exercises 1-15',
    priority: 'MEDIUM',
    estimatedSessions: 2,
    completedSessions: 0,
    isCompleted: false,
    subject: {
      id: 'sub_math',
      name: 'Mathematics',
      color: '#10B981',
    },
    createdAt: new Date().toISOString(),
  },
];

export const LocalStorageRepository = {
  // --- PREFERENCES ---
  getPreferences(): UserPreference {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_PREFERENCES;
  },

  savePreferences(updates: Partial<UserPreference>): UserPreference {
    const current = this.getPreferences();
    const updated = { ...current, ...updates };
    try {
      localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  },

  // --- SUBJECTS ---
  getSubjects(): Subject[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
      if (stored) {
        const subjects: Subject[] = JSON.parse(stored);
        if (subjects.length > 0) return subjects;
      }
    } catch {
      // ignore
    }
    // Seed defaults
    this.saveSubjects(DEFAULT_SUBJECTS);
    return DEFAULT_SUBJECTS;
  },

  saveSubjects(subjects: Subject[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
    } catch {
      // ignore
    }
  },

  addSubject(subject: Omit<Subject, 'id'>): Subject {
    const subjects = this.getSubjects();
    const newSubject: Subject = {
      ...subject,
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      taskCount: 0,
      completedSessionsCount: 0,
      totalFocusMinutes: 0,
    };
    subjects.push(newSubject);
    this.saveSubjects(subjects);
    return newSubject;
  },

  deleteSubject(id: string): void {
    const subjects = this.getSubjects().filter((s) => s.id !== id);
    this.saveSubjects(subjects);
  },

  // --- TASKS ---
  getTasks(): StudyTask[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (stored) {
        const tasks: StudyTask[] = JSON.parse(stored);
        if (tasks.length > 0) return tasks;
      }
    } catch {
      // ignore
    }
    this.saveTasks(DEFAULT_TASKS);
    return DEFAULT_TASKS;
  },

  saveTasks(tasks: StudyTask[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch {
      // ignore
    }
  },

  addTask(task: Omit<StudyTask, 'id' | 'completedSessions' | 'isCompleted'>): StudyTask {
    const tasks = this.getTasks();
    const subjects = this.getSubjects();
    const subject = subjects.find((s) => s.id === task.subjectId);

    const newTask: StudyTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      completedSessions: 0,
      isCompleted: false,
      subject: subject ? { id: subject.id, name: subject.name, color: subject.color } : null,
      createdAt: new Date().toISOString(),
    };
    tasks.unshift(newTask);
    this.saveTasks(tasks);
    return newTask;
  },

  toggleTask(id: string): StudyTask | null {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === id);
    if (!task) return null;
    task.isCompleted = !task.isCompleted;
    this.saveTasks(tasks);
    return task;
  },

  incrementTaskSession(id: string): void {
    const tasks = this.getTasks();
    const task = tasks.find((t) => t.id === id);
    if (task) {
      task.completedSessions = (task.completedSessions || 0) + 1;
      this.saveTasks(tasks);
    }
  },

  deleteTask(id: string): void {
    const tasks = this.getTasks().filter((t) => t.id !== id);
    this.saveTasks(tasks);
  },

  // --- SESSIONS ---
  getSessions(): FocusSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return [];
  },

  // --- ACTIVE TIMER SNAPSHOT (PAGE REFRESH & BACKGROUND RECOVERY) ---
  getActiveTimerSnapshot(): ActiveTimerSnapshot | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER_STATE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return null;
  },

  saveActiveTimerSnapshot(snapshot: ActiveTimerSnapshot): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER_STATE, JSON.stringify(snapshot));
    } catch {
      // ignore
    }
  },

  clearActiveTimerSnapshot(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER_STATE);
    } catch {
      // ignore
    }
  },

  recordCompletedSession(
    sessionType: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK',
    durationSeconds: number,
    subjectId?: string | null,
    taskId?: string | null,
    customId?: string,
    plannedDurationSeconds?: number
  ): FocusSession {
    const sessions = this.getSessions();
    const subjects = this.getSubjects();
    const tasks = this.getTasks();

    // Deduplication by custom ID
    if (customId) {
      const existing = sessions.find((s) => s.id === customId);
      if (existing) return existing;
    }

    // Deduplication by time window (within last 3 seconds with identical session parameters)
    const nowMs = Date.now();
    const duplicate = sessions.find((s) => {
      if (s.sessionType !== sessionType) return false;
      if (s.subjectId !== (subjectId || null)) return false;
      if (s.taskId !== (taskId || null)) return false;
      const dateStr = s.endedAt || s.createdAt;
      const sessionEndedMs = dateStr ? new Date(dateStr).getTime() : 0;
      return Math.abs(sessionEndedMs - nowMs) < 3000;
    });

    if (duplicate) {
      return duplicate;
    }

    const subject = subjects.find((s) => s.id === subjectId);
    const task = tasks.find((t) => t.id === taskId);

    const newSession: FocusSession = {
      id: customId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: 'user',
      sessionType,
      status: 'COMPLETED',
      plannedDuration: plannedDurationSeconds || durationSeconds,
      actualDuration: durationSeconds,
      startedAt: new Date(Date.now() - durationSeconds * 1000).toISOString(),
      endedAt: new Date().toISOString(),
      subjectId: subjectId || null,
      taskId: taskId || null,
      subject: subject ? { id: subject.id, name: subject.name, color: subject.color } : null,
      task: task ? { id: task.id, title: task.title } : null,
      createdAt: new Date().toISOString(),
    };

    sessions.unshift(newSession);
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }

    // Update task session count
    if (taskId && sessionType === 'FOCUS') {
      this.incrementTaskSession(taskId);
    }

    // Update subject focus minutes
    if (subjectId && sessionType === 'FOCUS') {
      const sub = subjects.find((s) => s.id === subjectId);
      if (sub) {
        sub.totalFocusMinutes = (sub.totalFocusMinutes || 0) + Math.round(durationSeconds / 60);
        sub.completedSessionsCount = (sub.completedSessionsCount || 0) + 1;
        this.saveSubjects(subjects);
      }
    }

    return newSession;
  },

  deleteSession(sessionId: string): void {
    let sessions = this.getSessions();
    sessions = sessions.filter((s) => s.id !== sessionId);
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  },

  deleteSessions(sessionIds: string[]): void {
    const idSet = new Set(sessionIds);
    let sessions = this.getSessions();
    sessions = sessions.filter((s) => !idSet.has(s.id));
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  },

  // --- DAILY FOCUS SUMMARY & STREAKS ---
  getDailySummary(): DailyFocusSummary {
    const sessions = this.getSessions();
    const prefs = this.getPreferences();
    const userTz = prefs.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const now = new Date();
    const todayDateStr = formatDateInTimezone(now, userTz);

    // Filter today's completed focus sessions in user's timezone
    const todaySessions = sessions.filter(
      (s) =>
        s.sessionType === 'FOCUS' &&
        s.status === 'COMPLETED' &&
        s.endedAt &&
        formatDateInTimezone(s.endedAt, userTz) === todayDateStr
    );

    const focusedMinutes = Math.round(
      todaySessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0) / 60
    );
    const completedSessions = todaySessions.length;
    const dailyGoalMinutes = prefs.dailyGoalMinutes || 120;
    const goalProgressPercentage = Math.min(
      100,
      dailyGoalMinutes > 0 ? Math.round((focusedMinutes / dailyGoalMinutes) * 100) : 0
    );

    // Calculate streak from unique active days in user's timezone
    const activeDates = Array.from(
      new Set(
        sessions
          .filter((s) => s.sessionType === 'FOCUS' && s.status === 'COMPLETED' && s.endedAt)
          .map((s) => formatDateInTimezone(s.endedAt!, userTz))
      )
    ).sort();

    let currentStreak = 0;
    let longestStreak = 0;
    const dateSet = new Set(activeDates);

    if (activeDates.length > 0) {
      // Compute longest streak
      let tempStreak = 1;
      longestStreak = 1;
      for (let i = 1; i < activeDates.length; i++) {
        const prev = new Date(activeDates[i - 1] + 'T00:00:00Z');
        const curr = new Date(activeDates[i] + 'T00:00:00Z');
        const diff = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          tempStreak += 1;
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        } else if (diff > 1) {
          tempStreak = 1;
        }
      }

      // Compute current streak: either today or yesterday in user's timezone
      const yesterdayStr = getShiftedDateKey(now, -1, userTz);
      let dayOffset = 0;
      if (!dateSet.has(todayDateStr)) {
        if (dateSet.has(yesterdayStr)) {
          dayOffset = -1;
        } else {
          dayOffset = 99999;
        }
      }

      if (dayOffset <= 0) {
        while (true) {
          const key = getShiftedDateKey(now, dayOffset, userTz);
          if (dateSet.has(key)) {
            currentStreak += 1;
            dayOffset -= 1;
          } else {
            break;
          }
        }
      }
    }

    return {
      focusedMinutes,
      completedSessions,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      dailyGoalMinutes,
      goalProgressPercentage,
    };
  },

  saveTask(task: StudyTask): void {
    const tasks = this.getTasks();
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      tasks[idx] = task;
    } else {
      tasks.unshift(task);
    }
    this.saveTasks(tasks);
  },

  saveSubject(subject: Subject): void {
    const subjects = this.getSubjects();
    const idx = subjects.findIndex((s) => s.id === subject.id);
    if (idx >= 0) {
      subjects[idx] = subject;
    } else {
      subjects.push(subject);
    }
    this.saveSubjects(subjects);
  },

  getStreak(timezone?: string) {
    const summary = this.getDailySummary();
    return {
      currentStreak: summary.currentStreak,
      longestStreak: summary.longestStreak,
    };
  },

  clearAll(): void {
    try {
      Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  },
};
