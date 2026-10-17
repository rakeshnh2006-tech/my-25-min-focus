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
});
