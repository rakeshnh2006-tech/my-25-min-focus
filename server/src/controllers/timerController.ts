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

  // Use interactive transaction to guarantee single-timer integrity and prevent race conditions
  const newSession = await prisma.$transaction(async (tx) => {
    // Auto-abandon any lingering active sessions for this user to ensure single-timer integrity
    const existingActive = await tx.focusSession.findMany({
      where: {
        userId,
        status: { in: ['RUNNING', 'PAUSED'] },
      },
    });

    for (const oldSession of existingActive) {
      const pauses = TimerService.parsePauseIntervals(oldSession.pauseIntervals);
      const partialActual = TimerService.calculateActualDuration(oldSession.startedAt, now, pauses);
      await tx.focusSession.update({
        where: { id: oldSession.id },
        data: {
          status: 'ABANDONED',
          endedAt: now,
          actualDuration: partialActual,
        },
      });
    }

    return tx.focusSession.create({
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

  // Idempotency: no-op if already in desired state
  if (action === 'PAUSE' && session.status === 'PAUSED') {
    return res.json({ session });
  }
  if (action === 'RESUME' && session.status === 'RUNNING') {
    return res.json({ session });
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
  const { actualDuration: reqActualDuration, taskId: reqTaskId } = req.body || {};

  const now = new Date();

  // Execute in transaction: verify status atomically to prevent double-counting
  const result = await prisma.$transaction(async (tx) => {
    const session = await tx.focusSession.findFirst({
      where: { id: sessionId, userId },
      include: { subject: true, task: true },
    });

    if (!session) {
      return { status: 404, error: 'Session not found' };
    }

    // Idempotency: if already completed, return existing session without incrementing task again
    if (session.status === 'COMPLETED') {
      return { status: 200, session, alreadyCompleted: true };
    }

    if (session.status === 'ABANDONED' || session.status === 'SKIPPED') {
      return {
        status: 400,
        error: `Cannot complete a session that has been ${session.status.toLowerCase()}`,
      };
    }

    const pauses = TimerService.parsePauseIntervals(session.pauseIntervals);

    // If session was paused, close the last pause interval before finishing
    if (session.status === 'PAUSED' && pauses.length > 0 && !pauses[pauses.length - 1].end) {
      pauses[pauses.length - 1].end = now.toISOString();
    }

    const calculatedDuration = TimerService.calculateActualDuration(session.startedAt, now, pauses);
    let actualDuration =
      typeof reqActualDuration === 'number' && reqActualDuration >= 0
        ? reqActualDuration
        : calculatedDuration;

    // Cap duration safely:
    // If plannedDuration > 0, cap at maximum of plannedDuration + 600 or plannedDuration * 2
    // If plannedDuration === 0 (Stopwatch), do not clamp to 300s!
    if (session.plannedDuration > 0) {
      const maxAllowed = Math.max(session.plannedDuration + 600, session.plannedDuration * 2);
      actualDuration = Math.min(actualDuration, maxAllowed);
    } else {
      actualDuration = Math.max(1, actualDuration);
    }

    const effectiveTaskId = reqTaskId !== undefined ? reqTaskId : session.taskId;

    const completedSession = await tx.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: now,
        actualDuration,
        pauseIntervals: JSON.stringify(pauses),
        ...(effectiveTaskId !== undefined ? { taskId: effectiveTaskId } : {}),
      },
      include: {
        subject: true,
        task: true,
      },
    });

    if (session.sessionType === 'FOCUS' && effectiveTaskId) {
      await tx.studyTask.update({
        where: { id: effectiveTaskId },
        data: {
          completedSessions: { increment: 1 },
        },
      });
    }

    return { status: 200, session: completedSession, alreadyCompleted: false };
  });

  if (result.status !== 200) {
    return res.status(result.status).json({ error: result.error });
  }

  if (result.alreadyCompleted) {
    return res.json({ session: result.session, message: 'Session was already completed' });
  }

  return res.json({ session: result.session });
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

  if (session.status === 'ABANDONED') {
    return res.json({ session, message: 'Session was already abandoned' });
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
