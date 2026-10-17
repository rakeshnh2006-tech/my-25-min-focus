import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  createTaskSchema,
  createSubjectSchema,
  updateSettingsSchema,
  createSessionSchema,
} from '../validation/schemas';

describe('Validation Schemas Tests', () => {
  describe('createTaskSchema', () => {
    it('accepts valid task data', () => {
      const valid = {
        title: 'Review Chapter 4 Algorithms',
        priority: 'HIGH',
        estimatedSessions: 3,
      };
      const res = createTaskSchema.safeParse(valid);
      assert.strictEqual(res.success, true);
    });

    it('rejects empty task title', () => {
      const invalid = { title: '' };
      const res = createTaskSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });

    it('rejects estimated sessions outside range', () => {
      const invalid = { title: 'Test', estimatedSessions: 0 };
      const res = createTaskSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });
  });

  describe('createSubjectSchema', () => {
    it('accepts valid subject with hex color', () => {
      const valid = {
        name: 'Distributed Systems',
        color: '#f97316',
        weeklyGoalMinutes: 300,
      };
      const res = createSubjectSchema.safeParse(valid);
      assert.strictEqual(res.success, true);
    });

    it('rejects invalid hex color string', () => {
      const invalid = {
        name: 'Math',
        color: 'not-a-color',
      };
      const res = createSubjectSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });
  });

  describe('updateSettingsSchema', () => {
    it('accepts valid duration settings', () => {
      const valid = {
        focusDuration: 30,
        shortBreakDuration: 5,
        longBreakDuration: 20,
        longBreakInterval: 4,
        dailyGoalMinutes: 180,
      };
      const res = updateSettingsSchema.safeParse(valid);
      assert.strictEqual(res.success, true);
    });

    it('rejects focus duration under 5 minutes', () => {
      const invalid = { focusDuration: 3 };
      const res = updateSettingsSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });

    it('rejects invalid theme name', () => {
      const invalid = { theme: 'neon-cyberpunk' };
      const res = updateSettingsSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });
  });

  describe('createSessionSchema', () => {
    it('accepts valid session parameters', () => {
      const valid = {
        sessionType: 'FOCUS',
        plannedDuration: 1500, // 25 mins
      };
      const res = createSessionSchema.safeParse(valid);
      assert.strictEqual(res.success, true);
    });

    it('rejects planned duration under 60 seconds', () => {
      const invalid = {
        sessionType: 'FOCUS',
        plannedDuration: 30,
      };
      const res = createSessionSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });

    it('rejects invalid session type', () => {
      const invalid = {
        sessionType: 'SLEEP',
        plannedDuration: 1500,
      };
      const res = createSessionSchema.safeParse(invalid);
      assert.strictEqual(res.success, false);
    });
  });
});
