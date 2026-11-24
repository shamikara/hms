/**
 * Date ranges for reports. Dates are stored as UTC midnight of a calendar day,
 * so a range is [from 00:00 UTC, to + 1 day 00:00 UTC): inclusive of both
 * days as a person reads them.
 */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** A year of rows is already a long PDF; anything longer is a mistake. */
const MAX_DAYS = 366;

export interface Period {
  from: string;
  to: string;
  start: Date;
  /** Exclusive: the day after `to`. */
  end: Date;
}

export function parsePeriod(from: string | null, to: string | null): Period | { error: string } {
  if (!from || !to || !ISO.test(from) || !ISO.test(to)) {
    return { error: "Choose a start and end date." };
  }
  const start = new Date(`${from}T00:00:00.000Z`);
  const last = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(last.getTime())) return { error: "Those dates are not valid." };
  if (last < start) return { error: "The end date is before the start date." };
  const end = new Date(last.getTime() + 86_400_000);
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_DAYS) {
    return { error: "Reports cover at most one year at a time." };
  }
  return { from, to, start, end };
}

/** "1 Dec 2026", always in UTC to match stored dates. */
export function formatDay(value: Date | string): string {
  const d = typeof value === "string" ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

/** Timestamps (payments, charges) shown in Sri Lanka time, where the desk is. */
export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  }).format(value);
}
