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
   * Returns the previous calendar day string YYYY-MM-DD for a given YYYY-MM-DD string
   */
  static getPreviousDateKey(dateKey: string): string {
    try {
      const [year, month, day] = dateKey.split('-').map(Number);
      const d = new Date(Date.UTC(year, month - 1, day - 1));
      return d.toISOString().split('T')[0];
    } catch {
      return dateKey;
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
      if (d) {
        uniqueDateSet.add(this.formatDateKey(new Date(d), timezone));
      }
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
    const yesterdayStr = this.getPreviousDateKey(todayStr);

    let currentStreak = 0;
    const hasToday = uniqueDateSet.has(todayStr);
    const hasYesterday = uniqueDateSet.has(yesterdayStr);

    if (hasToday || hasYesterday) {
      let checkKey = hasToday ? todayStr : yesterdayStr;

      while (uniqueDateSet.has(checkKey)) {
        currentStreak += 1;
        checkKey = this.getPreviousDateKey(checkKey);
      }
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      totalActiveDays,
    };
  }
}
