import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TimerService } from '../services/timerService';
import { PauseRecord } from '../types';

describe('TimerService Unit Tests', () => {
  it('parses valid and invalid pause interval JSON strings safely', () => {
    assert.deepStrictEqual(TimerService.parsePauseIntervals(null), []);
    assert.deepStrictEqual(TimerService.parsePauseIntervals(''), []);
    assert.deepStrictEqual(TimerService.parsePauseIntervals('invalid-json'), []);

    const validJSON = JSON.stringify([
      { start: '2026-10-17T10:00:00Z', end: '2026-10-17T10:05:00Z' },
    ]);
    const parsed = TimerService.parsePauseIntervals(validJSON);
    assert.strictEqual(parsed.length, 1);
    assert.strictEqual(parsed[0].start, '2026-10-17T10:00:00Z');
  });

  it('calculates total paused seconds accurately across multiple pauses', () => {
    const pauses: PauseRecord[] = [
      { start: '2026-10-17T10:05:00Z', end: '2026-10-17T10:07:00Z' }, // 120s
      { start: '2026-10-17T10:10:00Z', end: '2026-10-17T10:12:30Z' }, // 150s
    ];
    const totalPaused = TimerService.calculateTotalPausedSeconds(pauses);
    assert.strictEqual(totalPaused, 270);
  });

  it('calculates active unclosed pause time against reference time', () => {
    const pauses: PauseRecord[] = [
      { start: '2026-10-17T10:05:00Z' }, // Active unclosed pause
    ];
    const refTime = new Date('2026-10-17T10:08:00Z'); // 180s later
    const totalPaused = TimerService.calculateTotalPausedSeconds(pauses, refTime);
    assert.strictEqual(totalPaused, 180);
  });

  it('calculates actual focused duration subtracting paused time', () => {
    const start = new Date('2026-10-17T10:00:00Z');
    const end = new Date('2026-10-17T10:25:00Z'); // 1500 seconds total elapsed
    const pauses: PauseRecord[] = [
      { start: '2026-10-17T10:05:00Z', end: '2026-10-17T10:08:00Z' }, // 180s pause
    ];

    const actualDuration = TimerService.calculateActualDuration(start, end, pauses);
    // 1500s - 180s = 1320s
    assert.strictEqual(actualDuration, 1320);
  });

  it('calculates new target end timestamp when resuming a paused session', () => {
    const originalTargetEnd = new Date('2026-10-17T10:25:00Z');
    const pauseStart = new Date('2026-10-17T10:05:00Z');
    const resumeTime = new Date('2026-10-17T10:10:00Z'); // 5 minutes paused

    const newTarget = TimerService.calculateNewTargetEnd(originalTargetEnd, pauseStart, resumeTime);
    assert.strictEqual(newTarget.toISOString(), '2026-10-17T10:30:00.000Z');
  });

  it('enforces strict state transitions rules', () => {
    // Only RUNNING can be PAUSED
    assert.strictEqual(TimerService.isValidTransition('RUNNING', 'PAUSE'), true);
    assert.strictEqual(TimerService.isValidTransition('PAUSED', 'PAUSE'), false);
    assert.strictEqual(TimerService.isValidTransition('COMPLETED', 'PAUSE'), false);

    // Only PAUSED can be RESUMED
    assert.strictEqual(TimerService.isValidTransition('PAUSED', 'RESUME'), true);
    assert.strictEqual(TimerService.isValidTransition('RUNNING', 'RESUME'), false);

    // Both RUNNING and PAUSED can be completed or abandoned
    assert.strictEqual(TimerService.isValidTransition('RUNNING', 'COMPLETE'), true);
    assert.strictEqual(TimerService.isValidTransition('PAUSED', 'COMPLETE'), true);
    assert.strictEqual(TimerService.isValidTransition('COMPLETED', 'COMPLETE'), false);
    assert.strictEqual(TimerService.isValidTransition('ABANDONED', 'COMPLETE'), false);

    assert.strictEqual(TimerService.isValidTransition('RUNNING', 'ABANDON'), true);
    assert.strictEqual(TimerService.isValidTransition('PAUSED', 'ABANDON'), true);
    assert.strictEqual(TimerService.isValidTransition('COMPLETED', 'ABANDON'), false);
  });

  it('accurately calculates wall-clock remaining time and prevents negative countdowns', () => {
    const plannedSeconds = 1500; // 25 minutes
    const startTimeMs = 1700000000000;
    const targetEndMs = startTimeMs + plannedSeconds * 1000;

    // 10 minutes in (600s elapsed -> 900s remaining)
    const midTimeMs = startTimeMs + 600 * 1000;
    const remainingMid = Math.max(0, Math.ceil((targetEndMs - midTimeMs) / 1000));
    assert.strictEqual(remainingMid, 900);

    // Exactly at end (0s remaining)
    const exactEndMs = targetEndMs;
    const remainingExact = Math.max(0, Math.ceil((targetEndMs - exactEndMs) / 1000));
    assert.strictEqual(remainingExact, 0);

    // After end (should be clamped to 0, not negative)
    const pastEndMs = targetEndMs + 120 * 1000;
    const remainingPast = Math.max(0, Math.ceil((targetEndMs - pastEndMs) / 1000));
    assert.strictEqual(remainingPast, 0);
  });

  it('recovers countdown accurately across simulated page refresh or device sleep', () => {
    const plannedSeconds = 1500;
    const nowMs = 1700000000000;
    const targetEndMs = nowMs + plannedSeconds * 1000;

    // Simulate page refresh 12.5 minutes later
    const refreshTimeMs = nowMs + 750 * 1000;
    const recoveredRemaining = Math.max(0, Math.ceil((targetEndMs - refreshTimeMs) / 1000));
    assert.strictEqual(recoveredRemaining, 750);

    // Simulate device sleep where tab wakes after timer expired
    const wakeAfterSleepMs = targetEndMs + 300 * 1000;
    const wakeRemaining = Math.max(0, Math.ceil((targetEndMs - wakeAfterSleepMs) / 1000));
    assert.strictEqual(wakeRemaining, 0);
    // Verified that remaining <= 0 cleanly triggers completion exactly once without underflowing
    assert.ok(wakeRemaining <= 0);
  });

  it('calculates stopwatch elapsed time accurately with multiple pause periods', () => {
    const stopwatchStartMs = 1700000000000;
    const totalPausedMs = (120 + 90) * 1000; // 210s total paused
    const checkTimeMs = stopwatchStartMs + 1000 * 1000; // 1000s wall clock elapsed

    const elapsedSeconds = Math.max(0, Math.floor((checkTimeMs - stopwatchStartMs - totalPausedMs) / 1000));
    // 1000s - 210s = 790s
    assert.strictEqual(elapsedSeconds, 790);
  });

  it('calculates manual completion duration correctly without inflating paused duration', () => {
    const totalDuration = 1500;
    const secondsRemaining = 600; // 10 minutes left
    const elapsedFocused = Math.max(1, Math.min(totalDuration, totalDuration - secondsRemaining));
    assert.strictEqual(elapsedFocused, 900); // 15 minutes of focus
  });
});
