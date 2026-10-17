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

  // Determine start and end of today in user's timezone
  const now = new Date();
  const todayKey = StreakService.formatDateKey(now, timezone);
  const startOfToday = new Date(`${todayKey}T00:00:00Z`);
  const endOfToday = new Date(`${todayKey}T23:59:59.999Z`);

  // Query completed focus sessions today
  const todaySessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      sessionType: 'FOCUS',
      startedAt: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
    select: {
      actualDuration: true,
    },
  });

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

  // Query active tasks due today or overdue
  const tasksDueToday = await prisma.studyTask.findMany({
    where: {
      userId,
      isCompleted: false,
      dueDate: {
        lte: endOfToday,
      },
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
    take: 5,
  });

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

  // Build the last 7 calendar days array
  const days: { date: string; day: string; minutes: number; sessions: number }[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = StreakService.formatDateKey(d, timezone);
    const dayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone }).format(d);
    days.push({
      date: dateKey,
      day: dayLabel,
      minutes: 0,
      sessions: 0,
    });
  }

  const startDate = new Date(`${days[0].date}T00:00:00Z`);
  const endDate = new Date(`${days[days.length - 1].date}T23:59:59.999Z`);

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
