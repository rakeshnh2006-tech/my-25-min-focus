import { describe, it } from 'node:test';
import assert from 'node:assert';
import { StreakService } from '../services/streakService';

describe('StreakService Unit Tests', () => {
  it('returns zero streaks when session dates array is empty', () => {
    const result = StreakService.calculateStreaks([]);
    assert.deepStrictEqual(result, { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 });
  });

  it('calculates current streak when user studied today', () => {
    const refDate = new Date('2026-10-17T14:00:00Z');
    const sessionDates = [
      new Date('2026-10-17T10:00:00Z'), // Today
      new Date('2026-10-16T15:00:00Z'), // Yesterday
      new Date('2026-10-15T09:00:00Z'), // Day before yesterday
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'UTC', refDate);
    assert.strictEqual(result.currentStreak, 3);
    assert.strictEqual(result.longestStreak, 3);
    assert.strictEqual(result.totalActiveDays, 3);
  });

  it('keeps streak alive if user studied yesterday but has not studied today yet', () => {
    const refDate = new Date('2026-10-17T14:00:00Z'); // Today
    const sessionDates = [
      new Date('2026-10-16T15:00:00Z'), // Yesterday
      new Date('2026-10-15T09:00:00Z'), // Day before yesterday
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'UTC', refDate);
    assert.strictEqual(result.currentStreak, 2);
    assert.strictEqual(result.longestStreak, 2);
    assert.strictEqual(result.totalActiveDays, 2);
  });

  it('resets current streak to 0 if user missed both today and yesterday', () => {
    const refDate = new Date('2026-10-17T14:00:00Z'); // Today
    const sessionDates = [
      new Date('2026-10-14T15:00:00Z'), // 3 days ago
      new Date('2026-10-13T09:00:00Z'), // 4 days ago
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'UTC', refDate);
    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.longestStreak, 2);
    assert.strictEqual(result.totalActiveDays, 2);
  });

  it('accurately calculates longest streak when historical streaks were broken', () => {
    const refDate = new Date('2026-10-17T14:00:00Z');
    const sessionDates = [
      // 5-day streak in September
      new Date('2026-09-01T10:00:00Z'),
      new Date('2026-09-02T10:00:00Z'),
      new Date('2026-09-03T10:00:00Z'),
      new Date('2026-09-04T10:00:00Z'),
      new Date('2026-09-05T10:00:00Z'),
      // Current 2-day streak in October
      new Date('2026-10-16T10:00:00Z'),
      new Date('2026-10-17T10:00:00Z'),
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'UTC', refDate);
    assert.strictEqual(result.currentStreak, 2);
    assert.strictEqual(result.longestStreak, 5);
    assert.strictEqual(result.totalActiveDays, 7);
  });

  it('deduplicates multiple sessions on the same calendar day', () => {
    const refDate = new Date('2026-10-17T18:00:00Z');
    const sessionDates = [
      new Date('2026-10-17T09:00:00Z'),
      new Date('2026-10-17T11:00:00Z'),
      new Date('2026-10-17T14:00:00Z'),
      new Date('2026-10-17T17:00:00Z'),
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'UTC', refDate);
    assert.strictEqual(result.currentStreak, 1);
    assert.strictEqual(result.longestStreak, 1);
    assert.strictEqual(result.totalActiveDays, 1);
  });

  it('calculates streaks correctly across non-UTC timezones (Asia/Kolkata UTC+5:30)', () => {
    // 2026-10-18 01:00:00 UTC is 2026-10-18 06:30:00 in Asia/Kolkata
    const refDate = new Date('2026-10-18T01:00:00Z');
    const sessionDates = [
      new Date('2026-10-17T20:00:00Z'), // In UTC this is 10-17, but in Asia/Kolkata this is 2026-10-18 01:30 AM (Today!)
      new Date('2026-10-16T20:00:00Z'), // In Asia/Kolkata this is 2026-10-17 01:30 AM (Yesterday)
      new Date('2026-10-15T20:00:00Z'), // In Asia/Kolkata this is 2026-10-16 01:30 AM (2 days ago)
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'Asia/Kolkata', refDate);
    assert.strictEqual(result.currentStreak, 3);
    assert.strictEqual(result.longestStreak, 3);
    assert.strictEqual(result.totalActiveDays, 3);
  });

  it('calculates streaks correctly for negative UTC offset (America/New_York)', () => {
    // 2026-10-18 02:00:00 UTC is 2026-10-17 22:00:00 in America/New_York (still yesterday evening in NY)
    const refDate = new Date('2026-10-18T02:00:00Z');
    const sessionDates = [
      new Date('2026-10-17T15:00:00Z'), // 2026-10-17 11:00 AM NY (Today relative to refDate in NY)
      new Date('2026-10-16T15:00:00Z'), // 2026-10-16 11:00 AM NY (Yesterday)
    ];

    const result = StreakService.calculateStreaks(sessionDates, 'America/New_York', refDate);
    assert.strictEqual(result.currentStreak, 2);
    assert.strictEqual(result.longestStreak, 2);
    assert.strictEqual(result.totalActiveDays, 2);
  });

  it('computes exact previous date keys deterministically', () => {
    assert.strictEqual(StreakService.getPreviousDateKey('2026-10-18'), '2026-10-17');
    assert.strictEqual(StreakService.getPreviousDateKey('2026-10-01'), '2026-09-30');
    assert.strictEqual(StreakService.getPreviousDateKey('2026-01-01'), '2025-12-31');
    assert.strictEqual(StreakService.getPreviousDateKey('2024-03-01'), '2024-02-29'); // Leap year
  });
});
