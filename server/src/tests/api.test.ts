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
  });
});
