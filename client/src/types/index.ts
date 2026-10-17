export type SessionType = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
export type SessionStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'SKIPPED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AppTheme = 'dark' | 'light' | 'system';

export interface User {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface UserPreference {
  id: string;
  userId: string;
  focusDuration: number; // in minutes
  shortBreakDuration: number;
  longBreakDuration: number;
  longBreakInterval: number;
  dailyGoalMinutes: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  theme: AppTheme;
  timezone: string;
  hasCompletedOnboarding: boolean;
}

export interface Subject {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  weeklyGoalMinutes: number;
  taskCount?: number;
  completedSessionsCount?: number;
  totalFocusMinutes?: number;
  createdAt?: string;
}

export interface StudyTask {
  id: string;
  userId?: string;
  subjectId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: TaskPriority;
  estimatedSessions: number;
  completedSessions: number;
  isCompleted: boolean;
  subject?: {
    id: string;
    name: string;
    color: string;
  } | null;
  createdAt?: string;
}

export interface FocusSession {
  id: string;
  userId: string;
  subjectId?: string | null;
  taskId?: string | null;
  sessionType: SessionType;
  status: SessionStatus;
  plannedDuration: number; // in seconds
  actualDuration: number;  // in seconds
  startedAt: string;
  endedAt?: string | null;
  targetEndAt?: string | null;
  pauseIntervals?: string | null;
  subject?: {
    id: string;
    name: string;
    color: string;
  } | null;
  task?: {
    id: string;
    title: string;
    estimatedSessions?: number;
    completedSessions?: number;
  } | null;
  createdAt?: string;
}

export interface AuthStatusResponse {
  status: string;
  configured: boolean;
  database: {
    connected: boolean;
    error: string | null;
  };
  googleOAuth: {
    configured: boolean;
    callbackUrl: string;
  };
}
