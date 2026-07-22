import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

export class TimezoneUtils {
  /**
   * Converts a Property's local time to standard UTC for database storage.
   */
  static toUTC(localDate: Date | string, timezone: string): Date {
    return fromZonedTime(localDate, timezone);
  }

  /**
   * Converts UTC database time to the Property's local timezone for UI display.
   */
  static toPropertyLocal(utcDate: Date, timezone: string): Date {
    return toZonedTime(utcDate, timezone);
  }

  /**
   * Formats a date specifically for a property timezone.
   */
  static formatForProperty(date: Date, timezone: string, formatStr: string = 'yyyy-MM-dd HH:mm:ssXXX'): string {
    return formatInTimeZone(date, timezone, formatStr);
  }
}
