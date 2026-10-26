import { headers } from "next/headers";
import prisma from "@/core/db/prisma";
import { Logger } from "@/core/logging/Logger";

const logger = new Logger("RateLimit");

export interface RateLimitRule {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the current window closes. Zero when allowed. */
  retryAfterSeconds: number;
}

/** Sign-in attempts per address, and per account, per fifteen minutes. */
export const LOGIN_RULE: RateLimitRule = { limit: 10, windowMs: 15 * 60 * 1000 };

/** Booking submissions per address per hour. */
export const BOOKING_RULE: RateLimitRule = { limit: 12, windowMs: 60 * 60 * 1000 };

/**
 * The caller's address, as far as the platform will tell us.
 *
 * `x-forwarded-for` is a client-settable header that only the edge in front of
 * the app may be trusted to append to, so the *first* entry is the real client
 * only because Vercel rewrites it. Behind a different proxy this needs
 * revisiting — a spoofable key makes the limit decorative.
 */
export async function callerAddress(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? "unknown";
}

/**
 * Counts one request against `key` and says whether it may proceed.
 *
 * Fixed window rather than sliding: a window is a row, so an expired window
 * needs no eviction pass and the whole check is one upsert. The trade is that
 * a burst straddling a boundary can briefly reach twice the limit, which for
 * password guessing and booking spam is immaterial.
 *
 * Fails closed. These limits sit in front of operations that need the database
 * anyway, so a database that cannot count the attempt could not have served
 * the request either.
 */
export async function consumeRateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / rule.windowMs) * rule.windowMs);
  const resetsAt = windowStart.getTime() + rule.windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetsAt - now) / 1000));

  try {
    const hit = await prisma.rateLimitHit.upsert({
      where: { key_windowStart: { key, windowStart } },
      update: { count: { increment: 1 } },
      create: { key, windowStart, count: 1 },
      select: { count: true },
    });

    if (hit.count > rule.limit) {
      return { allowed: false, retryAfterSeconds };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    logger.error("Rate limit check failed; refusing the request", error, { key });
    return { allowed: false, retryAfterSeconds };
  }
}

/**
 * Drops windows that closed a while ago.
 *
 * Called opportunistically from the throttled paths rather than on a schedule,
 * because the table is tiny and this codebase has no job runner. Never throws:
 * failing to tidy up must not fail the request that triggered it.
 */
export async function sweepExpiredRateLimits(olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  try {
    await prisma.rateLimitHit.deleteMany({
      where: { windowStart: { lt: new Date(Date.now() - olderThanMs) } },
    });
  } catch (error) {
    logger.warn("Could not sweep expired rate limit rows", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Human-readable wait, for the message shown to whoever hit the limit. */
export function describeWait(seconds: number): string {
  if (seconds < 60) return "a moment";
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}
