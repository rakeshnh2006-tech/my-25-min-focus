import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getSettings(req: Request, res: Response) {
  const userId = (req.user as any).id;

  let preference = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (!preference) {
    preference = await prisma.userPreference.create({
      data: {
        userId,
        focusDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        longBreakInterval: 4,
        dailyGoalMinutes: 120,
        soundEnabled: true,
        notificationsEnabled: false,
        theme: 'dark',
        timezone: 'UTC',
        hasCompletedOnboarding: false,
      },
    });
  }

  return res.json({ preference });
}

export async function updateSettings(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const updates = req.body;

  const updated = await prisma.userPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      focusDuration: updates.focusDuration || 25,
      shortBreakDuration: updates.shortBreakDuration || 5,
      longBreakDuration: updates.longBreakDuration || 15,
      longBreakInterval: updates.longBreakInterval || 4,
      dailyGoalMinutes: updates.dailyGoalMinutes || 120,
      soundEnabled: updates.soundEnabled ?? true,
      notificationsEnabled: updates.notificationsEnabled ?? false,
      theme: updates.theme || 'dark',
      timezone: updates.timezone || 'UTC',
      hasCompletedOnboarding: updates.hasCompletedOnboarding ?? false,
    },
  });

  return res.json({ preference: updated });
}
