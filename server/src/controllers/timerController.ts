import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { TimerService } from '../services/timerService';
import { PauseRecord } from '../types';

export async function getActiveSession(req: Request, res: Response) {
  const userId = (req.user as any).id;

  const session = await prisma.focusSession.findFirst({
    where: {
      userId,
      status: { in: ['RUNNING', 'PAUSED'] },
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
          estimatedSessions: true,
          completedSessions: true,
        },
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  return res.json({ session: session || null });
}

export async function createSession(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const { sessionType, plannedDuration, subjectId, taskId } = req.body;

  // Validate subject ownership if provided
  if (subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, userId },
    });
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found or does not belong to you' });
    }
  }

  // Validate task ownership if provided
  if (taskId) {
    const task = await prisma.studyTask.findFirst({
      where: { id: taskId, userId },
    });
    if (!task) {
      return res.status(404).json({ error: 'Task not found or does not belong to you' });
    }
  }

  const now = new Date();
  const targetEndAt = new Date(now.getTime() + plannedDuration * 1000);

  // Auto-abandon any lingering active sessions for this user to ensure single-timer integrity
  const existingActive = await prisma.focusSession.findMany({
    where: {
      userId,
      status: { in: ['RUNNING', 'PAUSED'] },
    },
  });

  for (const oldSession of existingActive) {
    const pauses = TimerService.parsePauseIntervals(oldSession.pauseIntervals);
    const partialActual = TimerService.calculateActualDuration(oldSession.startedAt, now, pauses);
    await prisma.focusSession.update({
      where: { id: oldSession.id },
      data: {
        status: 'ABANDONED',
        endedAt: now,
        actualDuration: partialActual,
      },
    });
  }

  const newSession = await prisma.focusSession.create({
    data: {
      userId,
      sessionType,
      status: 'RUNNING',
      plannedDuration,
      actualDuration: 0,
      startedAt: now,
      targetEndAt,
      pauseIntervals: JSON.stringify([]),
      subjectId: subjectId || null,
      taskId: taskId || null,
    },
    include: {
      subject: true,
      task: true,
    },
  });

  return res.status(201).json({ session: newSession });
}

export async function updateSession(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const sessionId = req.params.id;
  const { action } = req.body;

  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (!TimerService.isValidTransition(session.status, action)) {
    return res.status(400).json({
      error: `Invalid transition: cannot ${action.toLowerCase()} a session with status ${session.status}`,
    });
  }

  const now = new Date();
  const pauses = TimerService.parsePauseIntervals(session.pauseIntervals);

  if (action === 'PAUSE') {
    pauses.push({ start: now.toISOString() });
    const updated = await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'PAUSED',
        pauseIntervals: JSON.stringify(pauses),
      },
      include: { subject: true, task: true },
    });
    return res.json({ session: updated });
  } else if (action === 'RESUME') {
    // Close the latest open pause record
    const lastPause = pauses[pauses.length - 1];
    let newTargetEnd = session.targetEndAt || now;

    if (lastPause && !lastPause.end) {
      lastPause.end = now.toISOString();
      if (session.targetEndAt) {
        newTargetEnd = TimerService.calculateNewTargetEnd(
          session.targetEndAt,
          new Date(lastPause.start),
          now
        );
      }
    }

    const updated = await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'RUNNING',
        targetEndAt: newTargetEnd,
        pauseIntervals: JSON.stringify(pauses),
      },
      include: { subject: true, task: true },
    });
    return res.json({ session: updated });
  }

  return res.status(400).json({ error: 'Unknown action' });
}

export async function completeSession(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const sessionId = req.params.id;

  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Idempotency: if already completed, return existing session to prevent duplicate completion
  if (session.status === 'COMPLETED') {
    return res.json({ session, message: 'Session was already completed' });
  }

  if (session.status === 'ABANDONED' || session.status === 'SKIPPED') {
    return res.status(400).json({
      error: `Cannot complete a session that has been ${session.status.toLowerCase()}`,
    });
  }

  const now = new Date();
  const pauses = TimerService.parsePauseIntervals(session.pauseIntervals);

  // If session was paused, close the last pause interval before finishing
  if (session.status === 'PAUSED' && pauses.length > 0 && !pauses[pauses.length - 1].end) {
    pauses[pauses.length - 1].end = now.toISOString();
  }

  const actualDuration = TimerService.calculateActualDuration(session.startedAt, now, pauses);

  // Execute in transaction: update session, increment task counter if applicable
  const result = await prisma.$transaction(async (tx) => {
    const completedSession = await tx.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: now,
        actualDuration: Math.min(actualDuration, session.plannedDuration + 300), // Cap at planned duration + small buffer
        pauseIntervals: JSON.stringify(pauses),
      },
      include: {
        subject: true,
        task: true,
      },
    });

    if (session.sessionType === 'FOCUS' && session.taskId) {
      await tx.studyTask.update({
        where: { id: session.taskId },
        data: {
          completedSessions: { increment: 1 },
        },
      });
    }

    return completedSession;
  });

  return res.json({ session: result });
}

export async function abandonSession(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const sessionId = req.params.id;

  const session = await prisma.focusSession.findFirst({
    where: { id: sessionId, userId },
  });

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (session.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Cannot abandon an already completed session' });
  }

  const now = new Date();
  const pauses = TimerService.parsePauseIntervals(session.pauseIntervals);

  if (session.status === 'PAUSED' && pauses.length > 0 && !pauses[pauses.length - 1].end) {
    pauses[pauses.length - 1].end = now.toISOString();
  }

  const partialActual = TimerService.calculateActualDuration(session.startedAt, now, pauses);

  const updated = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: 'ABANDONED',
      endedAt: now,
      actualDuration: partialActual,
      pauseIntervals: JSON.stringify(pauses),
    },
    include: { subject: true, task: true },
  });

  return res.json({ session: updated });
}

export async function getSessions(req: Request, res: Response) {
  const userId = (req.user as any).id;
  const { page = 1, limit = 20, status, sessionType, subjectId, startDate, endDate } = req.query as any;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const where: any = { userId };
  if (status) where.status = status;
  if (sessionType) where.sessionType = sessionType;
  if (subjectId) where.subjectId = subjectId;

  if (startDate || endDate) {
    where.startedAt = {};
    if (startDate) where.startedAt.gte = new Date(startDate);
    if (endDate) where.startedAt.lte = new Date(endDate);
  }

  const [total, sessions] = await Promise.all([
    prisma.focusSession.count({ where }),
    prisma.focusSession.findMany({
      where,
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
        startedAt: 'desc',
      },
      skip,
      take: limitNum,
    }),
  ]);

  return res.json({
    sessions,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}
