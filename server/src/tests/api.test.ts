import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/db';

describe('API Integration Tests', () => {
  const app = createApp();

  after(async () => {
    await prisma.$disconnect();
  });

  describe('Unauthenticated Access Protection', () => {
    it('rejects unauthenticated GET /api/auth/me with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    it('rejects unauthenticated GET /api/dashboard/summary with 401', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    it('rejects unauthenticated GET /api/sessions/active with 401', async () => {
      const res = await request(app).get('/api/sessions/active');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    it('rejects unauthenticated GET /api/tasks with 401', async () => {
      const res = await request(app).get('/api/tasks');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    it('rejects unauthenticated GET /api/subjects with 401', async () => {
      const res = await request(app).get('/api/subjects');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    it('rejects unauthenticated GET /api/settings with 401', async () => {
      const res = await request(app).get('/api/settings');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });

    it('rejects unauthenticated GET /api/analytics/summary with 401', async () => {
      const res = await request(app).get('/api/analytics/summary');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.error, 'Unauthorized');
    });
  });

  describe('Public Endpoints and Configuration Check', () => {
    it('allows public access to /api/auth/status and returns setup info', async () => {
      const res = await request(app).get('/api/auth/status');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.ok('configured' in res.body);
      assert.ok('database' in res.body);
      assert.ok('googleOAuth' in res.body);
    });

    it('handles Google OAuth initiation with redirect to Google or error', async () => {
      const res = await request(app).get('/api/auth/google');
      // Should redirect either to Google accounts OAuth URL or client login error
      assert.strictEqual(res.status, 302);
      assert.ok(
        res.header.location.includes('accounts.google.com') ||
        res.header.location.includes('error=')
      );
    });

    it('handles Google OAuth callback failure gracefully with redirect', async () => {
      const res = await request(app).get('/api/auth/google/callback');
      assert.strictEqual(res.status, 302);
      assert.ok(res.header.location.includes('error='));
    });

    it('handles POST /api/auth/logout cleanly without requiring prior auth', async () => {
      const res = await request(app).post('/api/auth/logout');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
    });

    it('verifies that an authenticated session passes requireAuth and returns 200 on /api/auth/me', async () => {
      let existingUser;
      try {
        existingUser = await prisma.user.findFirst();
      } catch {
        return;
      }
      if (!existingUser) {
        return;
      }

      const testApp = createApp();
      testApp.post('/test-session-login', (req, res) => {
        req.login(existingUser, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          return res.json({ success: true, user: existingUser });
        });
      });

      const agent = request.agent(testApp);
      const loginRes = await agent.post('/test-session-login');
      assert.strictEqual(loginRes.status, 200);

      const meRes = await agent.get('/api/auth/me');
      assert.strictEqual(meRes.status, 200);
      assert.strictEqual(meRes.body.user.id, existingUser.id);
      assert.strictEqual(meRes.body.user.email, existingUser.email);
      assert.ok('preference' in meRes.body);
    });
  });

  describe('Session Lifecycle & Idempotency Integration Tests', () => {
    it('executes full session lifecycle with idempotency and duplicate prevention', async () => {
      let existingUser;
      try {
        existingUser = await prisma.user.findFirst();
      } catch {
        return;
      }
      if (!existingUser) {
        return;
      }

      const testApp = createApp();
      testApp.post('/test-login', (req, res) => {
        req.login(existingUser, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          return res.json({ success: true, user: existingUser });
        });
      });

      const agent = request.agent(testApp);
      await agent.post('/test-login');

      // 1. Start a focus session
      const startRes1 = await agent.post('/api/sessions').send({
        sessionType: 'FOCUS',
        plannedDuration: 1500,
      });
      assert.strictEqual(startRes1.status, 201);
      assert.strictEqual(startRes1.body.session.status, 'RUNNING');
      const sessionId1 = startRes1.body.session.id;

      // 2. Rapid second start request: ensures old session is abandoned and only 1 active session remains
      const startRes2 = await agent.post('/api/sessions').send({
        sessionType: 'FOCUS',
        plannedDuration: 1500,
      });
      assert.strictEqual(startRes2.status, 201);
      const sessionId2 = startRes2.body.session.id;
      assert.notStrictEqual(sessionId1, sessionId2);

      // Verify active session is sessionId2
      const activeRes = await agent.get('/api/sessions/active');
      assert.strictEqual(activeRes.status, 200);
      assert.strictEqual(activeRes.body.session?.id, sessionId2);

      // 3. Pause session
      const pauseRes = await agent.patch(`/api/sessions/${sessionId2}`).send({ action: 'PAUSE' });
      assert.strictEqual(pauseRes.status, 200);
      assert.strictEqual(pauseRes.body.session.status, 'PAUSED');

      // Duplicate pause idempotency (calling PAUSE when already PAUSED returns 200 cleanly)
      const dupPauseRes = await agent.patch(`/api/sessions/${sessionId2}`).send({ action: 'PAUSE' });
      assert.strictEqual(dupPauseRes.status, 200);
      assert.strictEqual(dupPauseRes.body.session.status, 'PAUSED');

      // 4. Resume session
      const resumeRes = await agent.patch(`/api/sessions/${sessionId2}`).send({ action: 'RESUME' });
      assert.strictEqual(resumeRes.status, 200);
      assert.strictEqual(resumeRes.body.session.status, 'RUNNING');

      // Duplicate resume idempotency
      const dupResumeRes = await agent.patch(`/api/sessions/${sessionId2}`).send({ action: 'RESUME' });
      assert.strictEqual(dupResumeRes.status, 200);
      assert.strictEqual(dupResumeRes.body.session.status, 'RUNNING');

      // 5. Complete session
      const completeRes1 = await agent.post(`/api/sessions/${sessionId2}/complete`).send({
        actualDuration: 1500,
      });
      assert.strictEqual(completeRes1.status, 200);
      assert.strictEqual(completeRes1.body.session.status, 'COMPLETED');

      // 6. Duplicate completion request: must return existing completed session without error
      const completeRes2 = await agent.post(`/api/sessions/${sessionId2}/complete`).send({
        actualDuration: 1500,
      });
      assert.strictEqual(completeRes2.status, 200);
      assert.strictEqual(completeRes2.body.session.status, 'COMPLETED');
      assert.ok(completeRes2.body.message?.includes('already completed'));

      // 7. Reject invalid transition: cannot abandon an already completed session
      const abandonCompletedRes = await agent.post(`/api/sessions/${sessionId2}/abandon`);
      assert.strictEqual(abandonCompletedRes.status, 400);

      // Cleanup
      await prisma.focusSession.deleteMany({
        where: { id: { in: [sessionId1, sessionId2] } },
      });
    });
  });
});
