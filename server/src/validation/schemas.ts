import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(120, 'Task title too long'),
  description: z.string().max(1000).optional().nullable(),
  subjectId: z.string().uuid('Invalid subject ID').optional().nullable(),
  dueDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  estimatedSessions: z.number().int().min(1, 'Estimated Pomodoros must be at least 1').max(20).default(1),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  completedSessions: z.number().int().min(0).optional(),
  isCompleted: z.boolean().optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(60, 'Subject name too long'),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code (e.g. #f97316)')
    .default('#f97316'),
  weeklyGoalMinutes: z.number().int().min(0).max(10080).default(0),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const updateSettingsSchema = z.object({
  focusDuration: z.number().int().min(5, 'Focus duration must be at least 5 minutes').max(120),
  shortBreakDuration: z.number().int().min(1, 'Short break must be at least 1 minute').max(60),
  longBreakDuration: z.number().int().min(5, 'Long break must be at least 5 minutes').max(90),
  longBreakInterval: z.number().int().min(1, 'Long break interval must be at least 1').max(12),
  dailyGoalMinutes: z.number().int().min(10, 'Daily goal must be at least 10 minutes').max(1440),
  soundEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  theme: z.enum(['dark', 'light', 'system']),
  timezone: z.string().min(1),
  hasCompletedOnboarding: z.boolean().optional(),
}).partial();

export const createSessionSchema = z.object({
  sessionType: z.enum(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK']),
  plannedDuration: z.number().int().min(60, 'Planned duration must be at least 60 seconds').max(7200),
  subjectId: z.string().uuid().optional().nullable(),
  taskId: z.string().uuid().optional().nullable(),
});

export const updateSessionActionSchema = z.object({
  action: z.enum(['PAUSE', 'RESUME']),
});

export const completeSessionSchema = z.object({
  actualDuration: z.number().int().min(0).max(7200).optional(),
  taskId: z.string().nullable().optional(),
});

export const abandonSessionSchema = z.object({
  actualDuration: z.number().int().min(0).max(7200).optional(),
});

export const sessionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['COMPLETED', 'ABANDONED', 'SKIPPED', 'RUNNING', 'PAUSED']).optional(),
  sessionType: z.enum(['FOCUS', 'SHORT_BREAK', 'LONG_BREAK']).optional(),
  subjectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
