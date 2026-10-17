import { PauseRecord } from '../types';

export class TimerService {
  /**
   * Parses JSON string of pause intervals
   */
  static parsePauseIntervals(pauseStr: string | null | undefined): PauseRecord[] {
    if (!pauseStr) return [];
    try {
      const parsed = JSON.parse(pauseStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Calculates total paused time in seconds from pause records up to a reference time
   */
  static calculateTotalPausedSeconds(
    pauses: PauseRecord[],
    referenceTime: Date = new Date()
  ): number {
    let totalSeconds = 0;
    const refMs = referenceTime.getTime();

    for (const pause of pauses) {
      const startMs = new Date(pause.start).getTime();
      const endMs = pause.end ? new Date(pause.end).getTime() : refMs;
      if (endMs > startMs) {
        totalSeconds += Math.floor((endMs - startMs) / 1000);
      }
    }

    return Math.max(0, totalSeconds);
  }

  /**
   * Calculates actual focused seconds between startedAt and endedAt (or now),
   * subtracting all paused intervals.
   */
  static calculateActualDuration(
    startedAt: Date,
    endedAt: Date = new Date(),
    pauses: PauseRecord[]
  ): number {
    const startMs = new Date(startedAt).getTime();
    const endMs = new Date(endedAt).getTime();
    const totalElapsedSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
    const totalPausedSeconds = this.calculateTotalPausedSeconds(pauses, endedAt);
    return Math.max(0, totalElapsedSeconds - totalPausedSeconds);
  }

  /**
   * Computes the new target end timestamp when resuming a paused session
   */
  static calculateNewTargetEnd(
    originalTargetEnd: Date,
    pauseStart: Date,
    resumeTime: Date = new Date()
  ): Date {
    const pauseDurationMs = Math.max(0, resumeTime.getTime() - new Date(pauseStart).getTime());
    return new Date(new Date(originalTargetEnd).getTime() + pauseDurationMs);
  }

  /**
   * Checks if a session status transition is allowed
   */
  static isValidTransition(
    currentStatus: string,
    action: 'PAUSE' | 'RESUME' | 'COMPLETE' | 'ABANDON' | 'SKIP'
  ): boolean {
    switch (action) {
      case 'PAUSE':
        return currentStatus === 'RUNNING';
      case 'RESUME':
        return currentStatus === 'PAUSED';
      case 'COMPLETE':
        return currentStatus === 'RUNNING' || currentStatus === 'PAUSED';
      case 'ABANDON':
        return currentStatus === 'RUNNING' || currentStatus === 'PAUSED';
      case 'SKIP':
        return currentStatus === 'RUNNING' || currentStatus === 'PAUSED';
      default:
        return false;
    }
  }
}
