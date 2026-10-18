import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { getRuntimeDatabaseUrl } from '../config/db';
import { PrismaSessionStore } from '../config/sessionStore';
import { prisma } from '../config/db';

describe('Connection Pooler & Database Config Unit Tests', () => {
  it('enforces pgbouncer=true and connection_limit=1 on Supabase transaction pooler port 6543', () => {
    const rawUrl =
      'postgresql://postgres.xyz:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require';
    const optimized = getRuntimeDatabaseUrl(rawUrl);

    assert.ok(optimized.includes('pgbouncer=true'), 'Expected pgbouncer=true to be added for transaction pooler');
    assert.ok(optimized.includes('connection_limit=1'), 'Expected connection_limit=1 to prevent serverless connection exhaustion');
    assert.ok(optimized.includes('sslmode=require'), 'Expected original sslmode parameter to be preserved');
  });

  it('preserves existing connection_limit and pgbouncer when already configured', () => {
    const rawUrl =
      'postgresql://postgres.xyz:password@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=2';
    const optimized = getRuntimeDatabaseUrl(rawUrl);

    assert.ok(optimized.includes('pgbouncer=true'));
    assert.ok(optimized.includes('connection_limit=2'), 'Explicit connection limit should be preserved');
  });

  it('adds connection_limit=1 to local or standard postgresql URLs without breaking them', () => {
    const rawUrl = 'postgresql://user:pass@localhost:5432/cognify';
    const optimized = getRuntimeDatabaseUrl(rawUrl);

    assert.ok(optimized.includes('connection_limit=1'));
  });

  it('handles invalid or empty URLs safely without throwing', () => {
    assert.strictEqual(getRuntimeDatabaseUrl(''), '');
    assert.strictEqual(getRuntimeDatabaseUrl('invalid-url-string'), 'invalid-url-string');
  });
});

describe('PrismaSessionStore Unit Tests', () => {
  const store = new PrismaSessionStore();
  const testSid = `test_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  it('stores and retrieves session data correctly', async () => {
    let dbConnected = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }
    if (!dbConnected) return;

    const sessionData: any = {
      cookie: {
        originalMaxAge: 86400000,
        expires: new Date(Date.now() + 86400000).toISOString(),
        httpOnly: true,
        path: '/',
      },
      passport: {
        user: 'user-123',
      },
    };

    // 1. Set session
    await new Promise<void>((resolve, reject) => {
      store.set(testSid, sessionData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2. Get session
    const retrieved = await new Promise<any>((resolve, reject) => {
      store.get(testSid, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    assert.ok(retrieved);
    assert.strictEqual(retrieved.passport?.user, 'user-123');

    // 3. Touch session
    sessionData.cookie.expires = new Date(Date.now() + 172800000).toISOString();
    await new Promise<void>((resolve, reject) => {
      store.touch(testSid, sessionData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 4. Destroy session
    await new Promise<void>((resolve, reject) => {
      store.destroy(testSid, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 5. Verify destroyed session returns null
    const afterDestroy = await new Promise<any>((resolve, reject) => {
      store.get(testSid, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
    assert.strictEqual(afterDestroy, null);
  });

  it('returns null and cleans up expired sessions automatically', async () => {
    let dbConnected = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }
    if (!dbConnected) return;

    const expiredSid = `expired_sess_${Date.now()}`;
    const expiredData: any = {
      cookie: {
        originalMaxAge: 1000,
        expires: new Date(Date.now() - 10000).toISOString(), // expired in the past
        httpOnly: true,
      },
      passport: { user: 'old-user' },
    };

    await new Promise<void>((resolve, reject) => {
      store.set(expiredSid, expiredData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const result = await new Promise<any>((resolve, reject) => {
      store.get(expiredSid, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    assert.strictEqual(result, null);
  });

  after(async () => {
    await prisma.$disconnect().catch(() => {});
  });
});
