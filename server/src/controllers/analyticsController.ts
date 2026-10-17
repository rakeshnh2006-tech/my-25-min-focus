import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { StreakService } from '../services/streakService';

export async function getAnalyticsSummary(req: Request, res: Response) {
  const userId = (req.user as any).id;

  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });
  const timezone = preference?.timezone || 'UTC';

  // Query all completed focus sessions
  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      sessionType: 'FOCUS',
    },
    select: {
      actualDuration: true,
      startedAt: true,
    },
  });

  const totalFocusSeconds = sessions.reduce((acc, s) => acc + s.actualDuration, 0);
  const totalFocusMinutes = Math.round(totalFocusSeconds / 60);
  const totalCompletedSessions = sessions.length;
  const averageSessionMinutes =
    totalCompletedSessions > 0 ? Math.round(totalFocusMinutes / totalCompletedSessions) : 0;

  // Streaks
  const streakData = StreakService.calculateStreaks(
    sessions.map((s) => s.startedAt),
    timezone,
    new Date()
  );

  // Task completion metrics
  const [totalTasks, completedTasks] = await Promise.all([
    prisma.studyTask.count({ where: { userId } }),
    prisma.studyTask.count({ where: { userId, isCompleted: true } }),
  ]);

  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return res.json({
    summary: {
      totalFocusMinutes,
      totalFocusHours: Number((totalFocusMinutes / 60).toFixed(1)),
      totalCompletedSessions,
      averageSessionMinutes,
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      totalActiveDays: streakData.totalActiveDays,
      totalTasks,
      completedTasks,
      taskCompletionRate,
    },
  });
}

export async function getAnalyticsTrends(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const { range = '30d' } = req.query as { range?: string };

  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });
  const timezone = preference?.timezone || 'UTC';

  let daysCount = 30;
  if (range === '7d') daysCount = 7;
  else if (range === '90d') daysCount = 90;

  const now = new Date();
  const days: { date: string; day: string; minutes: number; sessions: number }[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = StreakService.formatDateKey(d, timezone);
    const dayLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    }).format(d);

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

  return res.json({ trends: result });
}

export async function getAnalyticsSubjects(req: Request, res: Response) {
  const userId = (req.user as any).id;

  const subjects = await prisma.subject.findMany({
    where: { userId },
    include: {
      sessions: {
        where: {
          status: 'COMPLETED',
          sessionType: 'FOCUS',
        },
        select: {
          actualDuration: true,
        },
      },
    },
  });

  // Also query sessions with no subject attached
  const unassignedSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      subjectId: null,
      status: 'COMPLETED',
      sessionType: 'FOCUS',
    },
    select: {
      actualDuration: true,
    },
  });

  let totalAllMinutes = 0;
  const breakdown = subjects.map((sub) => {
    const totalSecs = sub.sessions.reduce((acc, s) => acc + s.actualDuration, 0);
    const minutes = Math.round(totalSecs / 60);
    totalAllMinutes += minutes;
    return {
      id: sub.id,
      name: sub.name,
      color: sub.color,
      minutes,
      sessions: sub.sessions.length,
      percentage: 0,
    };
  });

  if (unassignedSessions.length > 0) {
    const unassignedSecs = unassignedSessions.reduce((acc, s) => acc + s.actualDuration, 0);
    const unassignedMins = Math.round(unassignedSecs / 60);
    totalAllMinutes += unassignedMins;
    breakdown.push({
      id: 'unassigned',
      name: 'General Study',
      color: '#64748b',
      minutes: unassignedMins,
      sessions: unassignedSessions.length,
      percentage: 0,
    });
  }

  // Calculate percentages
  const result = breakdown.map((item) => ({
    ...item,
    percentage: totalAllMinutes > 0 ? Math.round((item.minutes / totalAllMinutes) * 100) : 0,
  }));

  return res.json({
    subjects: result,
    totalMinutes: totalAllMinutes,
  });
}

export async function getAnalyticsHeatmap(req: Request, res: Response) {
  const userId = (req.user as any).id;

  const preference = await prisma.userPreference.findUnique({
    where: { userId },
  });
  const timezone = preference?.timezone || 'UTC';

  // 90 days heatmap
  const daysCount = 90;
  const now = new Date();
  const days: { date: string; minutes: number; sessions: number; level: number }[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dateKey = StreakService.formatDateKey(d, timezone);
    days.push({
      date: dateKey,
      minutes: 0,
      sessions: 0,
      level: 0,
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
    const mins = stats.minutes;
    // Calculate intensity level: 0 (0 min), 1 (1-25 min), 2 (26-50 min), 3 (51-100 min), 4 (>100 min)
    let level = 0;
    if (mins > 100) level = 4;
    else if (mins > 50) level = 3;
    else if (mins > 25) level = 2;
    else if (mins > 0) level = 1;

    return {
      date: d.date,
      minutes: mins,
      sessions: stats.sessions,
      level,
    };
  });

  return res.json({ heatmap: result });
}
