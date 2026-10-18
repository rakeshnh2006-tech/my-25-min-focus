import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { StreakService } from '../services/streakService';

export async function getDashboardSummary(req: Request, res: Response) {
  const userId = (req.user as any).id;

  // Fetch user preferences
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });

  const dailyGoalMinutes = preference?.dailyGoalMinutes || 120;
  const timezone = preference?.timezone || 'UTC';

  const now = new Date();
  const todayKey = StreakService.formatDateKey(now, timezone);

  // Timezone-safe candidate query window (covers +/- 48h to account for UTC-12 to UTC+14)
  const candidateStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const candidateEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const candidateSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      sessionType: 'FOCUS',
      startedAt: {
        gte: candidateStart,
        lte: candidateEnd,
      },
    },
    select: {
      startedAt: true,
      actualDuration: true,
    },
  });

  const todaySessions = candidateSessions.filter(
    (s) => StreakService.formatDateKey(s.startedAt, timezone) === todayKey
  );

  const todayFocusedSeconds = todaySessions.reduce((acc, s) => acc + s.actualDuration, 0);
  const todayFocusedMinutes = Math.round(todayFocusedSeconds / 60);
  const completedPomodorosToday = todaySessions.length;
  const goalProgressPercentage = Math.min(
    100,
    dailyGoalMinutes > 0 ? Math.round((todayFocusedMinutes / dailyGoalMinutes) * 100) : 0
  );

  // Compute streaks from all completed focus sessions
  const allFocusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      sessionType: 'FOCUS',
    },
    select: {
      startedAt: true,
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  const streakData = StreakService.calculateStreaks(
    allFocusSessions.map((s) => s.startedAt),
    timezone,
    now
  );

  // Query active tasks due today or overdue in user's timezone
  const activeTasks = await prisma.studyTask.findMany({
    where: {
      userId,
      isCompleted: false,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });

  // Filter in application code to guarantee timezone correctness
  const tasksDueToday = activeTasks
    .filter((t) => {
      if (!t.dueDate) return false;
      const taskDueKey = StreakService.formatDateKey(t.dueDate, timezone);
      return taskDueKey <= todayKey;
    })
    .slice(0, 5);

  // Query recently completed sessions
  const recentSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
      task: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: {
      endedAt: 'desc',
    },
    take: 5,
  });

  return res.json({
    today: {
      date: now.toISOString(),
      formattedDate: new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        timeZone: timezone,
      }).format(now),
      focusedMinutes: todayFocusedMinutes,
      completedPomodoros: completedPomodorosToday,
      dailyGoalMinutes,
      goalProgressPercentage,
    },
    streak: streakData,
    tasksDueToday,
    recentSessions,
  });
}

export async function getWeeklyStats(req: Request, res: Response) {
  const userId = (req.user as any).id;

  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });
  const timezone = preference?.timezone || 'UTC';

  // Build the last 7 calendar days array using deterministic previous date keys
  const now = new Date();
  const todayKey = StreakService.formatDateKey(now, timezone);

  const dateKeys: string[] = [];
  let currentKey = todayKey;
  for (let i = 0; i < 7; i++) {
    dateKeys.unshift(currentKey);
    currentKey = StreakService.getPreviousDateKey(currentKey);
  }

  // dateKeys is sorted oldest to newest (last 7 days ending with today)
  const days = dateKeys.map((key) => {
    const [y, m, d] = key.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'UTC' }).format(dateObj);
    return {
      date: key,
      day: dayLabel,
      minutes: 0,
      sessions: 0,
    };
  });

  const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      sessionType: 'FOCUS',
      startedAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      startedAt: true,
      actualDuration: true,
    },
  });

  // Aggregate by day
  const dayMap = new Map<string, { minutes: number; sessions: number }>();
  for (const s of sessions) {
    const key = StreakService.formatDateKey(s.startedAt, timezone);
    const existing = dayMap.get(key) || { minutes: 0, sessions: 0 };
    existing.minutes += Math.round(s.actualDuration / 60);
    existing.sessions += 1;
    dayMap.set(key, existing);
  }

  const result = days.map((d) => {
    const stats = dayMap.get(d.date) || { minutes: 0, sessions: 0 };
    return {
      date: d.date,
      day: d.day,
      minutes: stats.minutes,
      sessions: stats.sessions,
    };
  });

  return res.json({ weekly: result });
}
