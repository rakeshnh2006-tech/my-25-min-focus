import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { StreakService } from '../services/streakService';

export async function getTasks(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const { filter = 'all', subjectId } = req.query as { filter?: string; subjectId?: string };

  const where: any = { userId };
  if (subjectId) where.subjectId = subjectId;

  const now = new Date();
  const todayKey = StreakService.formatDateKey(now);
  const startOfToday = new Date(`${todayKey}T00:00:00Z`);
  const endOfToday = new Date(`${todayKey}T23:59:59.999Z`);

  if (filter === 'completed') {
    where.isCompleted = true;
  } else if (filter === 'today') {
    where.isCompleted = false;
    where.dueDate = { lte: endOfToday };
  } else if (filter === 'upcoming') {
    where.isCompleted = false;
    where.dueDate = { gt: endOfToday };
  }

  const tasks = await prisma.studyTask.findMany({
    where,
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
    orderBy: [
      { isCompleted: 'asc' },
      { dueDate: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return res.json({ tasks });
}

export async function createTask(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const { title, description, subjectId, dueDate, priority, estimatedSessions } = req.body;

  if (subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found or does not belong to you' });
    }
  }

  const task = await prisma.studyTask.create({
    data: {
      userId,
      title,
      description: description || null,
      subjectId: subjectId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority: priority || 'MEDIUM',
      estimatedSessions: estimatedSessions || 1,
      completedSessions: 0,
      isCompleted: false,
    },
    include: {
      subject: true,
    },
  });

  return res.status(201).json({ task });
}

export async function updateTask(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const taskId = req.params.id;

  const existing = await prisma.studyTask.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const { title, description, subjectId, dueDate, priority, estimatedSessions, completedSessions, isCompleted } =
    req.body;

  if (subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found or does not belong to you' });
    }
  }

  const updated = await prisma.studyTask.update({
    where: { id: taskId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(subjectId !== undefined ? { subjectId } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(estimatedSessions !== undefined ? { estimatedSessions } : {}),
      ...(completedSessions !== undefined ? { completedSessions } : {}),
      ...(isCompleted !== undefined ? { isCompleted } : {}),
    },
    include: {
      subject: true,
    },
  });

  return res.json({ task: updated });
}

export async function deleteTask(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const taskId = req.params.id;

  const existing = await prisma.studyTask.findFirst({
    where: { id: taskId, userId },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await prisma.studyTask.delete({
    where: { id: taskId },
  });

  return res.json({ success: true, message: 'Task deleted successfully' });
}
