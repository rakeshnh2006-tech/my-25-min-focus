import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getSubjects(req: Request, res: Response) {
  const userId = (req.user as any).id;

  const subjects = await prisma.subject.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          tasks: true,
          sessions: true,
        },
      },
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
    orderBy: {
      name: 'asc',
    },
  });

  const formatted = subjects.map((sub) => {
    const totalFocusSeconds = sub.sessions.reduce((acc, s) => acc + s.actualDuration, 0);
    return {
      id: sub.id,
      name: sub.name,
      description: sub.description,
      color: sub.color,
      weeklyGoalMinutes: sub.weeklyGoalMinutes,
      taskCount: sub._count.tasks,
      completedSessionsCount: sub.sessions.length,
      totalFocusMinutes: Math.round(totalFocusSeconds / 60),
      createdAt: sub.createdAt,
    };
  });

  return res.json({ subjects: formatted });
}

export async function createSubject(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const { name, description, color, weeklyGoalMinutes } = req.body;

  const subject = await prisma.subject.create({
    data: {
      userId,
      name,
      description: description || null,
      color: color || '#f97316',
      weeklyGoalMinutes: weeklyGoalMinutes || 0,
    },
  });

  return res.status(201).json({ subject });
}

export async function updateSubject(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const subjectId = req.params.id;

  const existing = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  const { name, description, color, weeklyGoalMinutes } = req.body;

  const updated = await prisma.subject.update({
    where: { id: subjectId },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(weeklyGoalMinutes !== undefined ? { weeklyGoalMinutes } : {}),
    },
  });

  return res.json({ subject: updated });
}

export async function deleteSubject(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const subjectId = req.params.id;

  const existing = await prisma.subject.findFirst({
    where: { id: subjectId, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  await prisma.subject.delete({
    where: { id: subjectId },
  });

  return res.json({ success: true, message: 'Subject deleted successfully' });
}
