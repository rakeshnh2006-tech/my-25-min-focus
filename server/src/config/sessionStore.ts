import session from 'express-session';
import { prisma } from './db';

/**
 * Lightweight, zero-dependency express-session store backed by Prisma.
 * Uses the existing `sessions` table (model Session) without spawning a secondary pg.Pool,
 * eliminating extra connection overhead and connection exhaustion in serverless runtimes.
 */
export class PrismaSessionStore extends session.Store {
  constructor() {
    super();
  }

  async get(sid: string, callback: (err?: any, sessionData?: session.SessionData | null) => void): Promise<void> {
    try {
      const record = await prisma.session.findUnique({
        where: { sid },
      });

      if (!record) {
        return callback(null, null);
      }

      // Check expiration
      if (new Date(record.expire).getTime() < Date.now()) {
        await prisma.session.deleteMany({ where: { sid } }).catch(() => {});
        return callback(null, null);
      }

      const data = typeof record.sess === 'string' ? JSON.parse(record.sess) : record.sess;
      return callback(null, data as session.SessionData);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void): Promise<void> {
    try {
      const expires = sessionData?.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const sess = sessionData as any;

      await prisma.session.upsert({
        where: { sid },
        create: {
          sid,
          sess,
          expire: expires,
        },
        update: {
          sess,
          expire: expires,
        },
      });

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async destroy(sid: string, callback?: (err?: any) => void): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { sid },
      }).catch(() => {});

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }

  async touch(sid: string, sessionData: session.SessionData, callback?: (err?: any) => void): Promise<void> {
    try {
      const expires = sessionData?.cookie?.expires
        ? new Date(sessionData.cookie.expires)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await prisma.session.update({
        where: { sid },
        data: { expire: expires },
      }).catch(() => {});

      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
    }
  }
}
