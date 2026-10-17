export class StreakService {
  /**
   * Formats a date into YYYY-MM-DD string in a specified timezone (defaults to UTC)
   */
  static formatDateKey(date: Date, timezone: string = 'UTC'): string {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);
    } catch {
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Calculates current streak and longest streak from completed focus session dates
   */
  static calculateStreaks(
    sessionDates: Date[],
    timezone: string = 'UTC',
    referenceDate: Date = new Date()
  ): { currentStreak: number; longestStreak: number; totalActiveDays: number } {
    if (!sessionDates || sessionDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
    }

    // Extract unique sorted dates as YYYY-MM-DD
    const uniqueDateSet = new Set<string>();
    for (const d of sessionDates) {
      uniqueDateSet.add(this.formatDateKey(new Date(d), timezone));
    }

    const uniqueDates = Array.from(uniqueDateSet).sort();
    const totalActiveDays = uniqueDates.length;

    if (totalActiveDays === 0) {
      return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 };
    }

    // Calculate longest streak
    let longestStreak = 1;
    let currentRun = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1] + 'T00:00:00Z');
      const currDate = new Date(uniqueDates[i] + 'T00:00:00Z');
      const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentRun += 1;
        if (currentRun > longestStreak) {
          longestStreak = currentRun;
        }
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }

    // Calculate current streak relative to referenceDate
    const todayStr = this.formatDateKey(referenceDate, timezone);
    const yesterday = new Date(referenceDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = this.formatDateKey(yesterday, timezone);

    let currentStreak = 0;
    const hasToday = uniqueDateSet.has(todayStr);
    const hasYesterday = uniqueDateSet.has(yesterdayStr);

    if (hasToday || hasYesterday) {
      let checkDate = new Date(referenceDate);
      if (!hasToday) {
        // Did not study today yet, but streak is active from yesterday
        checkDate = yesterday;
      }

      while (true) {
        const key = this.formatDateKey(checkDate, timezone);
        if (uniqueDateSet.has(key)) {
          currentStreak += 1;
          checkDate.setUTCDate(checkDate.getUTCDate() - 1);
        } else {
          break;
        }
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalActiveDays,
    };
  }
}
