import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import prisma from "@/core/db/prisma";
import { parseIcal } from "../lib/ical";

const DAY = 86_400_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 2 * 1024 * 1024;
/** Before a guest searches or books, links older than this are re-read. */
export const STALE_MS = 15 * 60 * 1000;

export class ChannelError extends Error {}

export function newExportToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Only https links to public hosts. The link is typed by staff, but the server
 * fetches it, so it must not be pointed at this server's own network.
 */
export function checkImportUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new ChannelError("That is not a valid link.");
  }
  if (url.protocol !== "https:") throw new ChannelError("Use the https:// calendar link from the booking site.");
  const host = url.hostname.toLowerCase();
  const privateHost =
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    (isIP(host) !== 0 && /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|::1|fc|fd|fe80)/i.test(host));
  if (privateHost) throw new ChannelError("That link points to a private address.");
  return url;
}

async function fetchCalendar(start: URL): Promise<string> {
  // Redirects are followed by hand so each hop is checked like the first.
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: "text/calendar, text/plain;q=0.9, */*;q=0.1", "User-Agent": "LilySafariResort-ChannelSync/1.0" },
      cache: "no-store",
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new ChannelError("The booking site sent a broken redirect.");
      url = checkImportUrl(new URL(next, url).toString());
      continue;
    }
    if (!res.ok) throw new ChannelError(`The booking site answered ${res.status}. Check the link is still valid.`);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) throw new ChannelError("That calendar is too large.");
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new ChannelError("That calendar is too large.");
    return text;
  }
  throw new ChannelError("Too many redirects.");
}

export interface SyncResult {
  connectionId: string;
  ok: boolean;
  blocks: number;
  error?: string;
}

/** Reads one connection's link and replaces its blocked nights. Never throws. */
export async function syncConnection(connectionId: string): Promise<SyncResult> {
  const conn = await prisma.calendarConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, roomId: true, importUrl: true },
  });
  if (!conn) return { connectionId, ok: false, blocks: 0, error: "Not found." };
  if (!conn.importUrl) return { connectionId, ok: true, blocks: 0 };

  try {
    const events = parseIcal(await fetchCalendar(checkImportUrl(conn.importUrl)));
    // Only what can still matter: from yesterday on, up to two years ahead.
    const from = new Date(Date.now() - DAY);
    const until = new Date(Date.now() + 730 * DAY);
    const rows = events
      .filter((e) => e.end > from && e.start < until)
      .slice(0, 2000)
      .map((e) => ({ connectionId: conn.id, roomId: conn.roomId, startDate: e.start, endDate: e.end, uid: e.uid, summary: e.summary }));

    await prisma.$transaction([
      prisma.externalBlock.deleteMany({ where: { connectionId: conn.id } }),
      ...(rows.length ? [prisma.externalBlock.createMany({ data: rows })] : []),
      prisma.calendarConnection.update({
        where: { id: conn.id },
        data: { lastSyncedAt: new Date(), lastStatus: "ok", lastError: null },
      }),
    ]);
    return { connectionId, ok: true, blocks: rows.length };
  } catch (error) {
    // Keep the last good blocks: a site being down must not open the dates up.
    const message =
      error instanceof ChannelError || (error instanceof Error && /calendar/.test(error.message))
        ? error.message
        : error instanceof Error && error.name === "TimeoutError"
          ? "The booking site took too long to answer."
          : "Could not read that calendar.";
    await prisma.calendarConnection
      .update({ where: { id: conn.id }, data: { lastSyncedAt: new Date(), lastStatus: "error", lastError: message } })
      .catch(() => undefined);
    return { connectionId, ok: false, blocks: 0, error: message };
  }
}

/**
 * Re-reads every link not read in the last `maxAgeMs`, in parallel, but gives
 * up waiting after `budgetMs` so a slow booking site never stalls a guest.
 * Called before availability searches and bookings.
 */
export async function syncStaleConnections(opts: { maxAgeMs?: number; budgetMs?: number } = {}): Promise<void> {
  const maxAgeMs = opts.maxAgeMs ?? STALE_MS;
  const budgetMs = opts.budgetMs ?? 4_000;
  try {
    const stale = await prisma.calendarConnection.findMany({
      where: {
        importUrl: { not: null },
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: new Date(Date.now() - maxAgeMs) } }],
      },
      select: { id: true },
      take: 50,
    });
    if (!stale.length) return;
    const all = Promise.allSettled(stale.map((c) => syncConnection(c.id)));
    await Promise.race([all, new Promise((r) => setTimeout(r, budgetMs))]);
  } catch (error) {
    console.error("syncStaleConnections failed:", error instanceof Error ? error.message : error);
  }
}

export interface ChannelConflict {
  roomNumber: string;
  source: string;
  reservationId: string;
  guestName: string;
  start: Date;
  end: Date;
}

/** Nights an outside site has sold that are also held by a booking here. */
export async function findConflicts(propertyId: string): Promise<ChannelConflict[]> {
  const blocks = await prisma.externalBlock.findMany({
    where: { endDate: { gt: new Date(Date.now() - DAY) }, room: { floor: { building: { propertyId } } } },
    select: { roomId: true, startDate: true, endDate: true, connection: { select: { name: true } }, room: { select: { roomNumber: true } } },
  });
  if (!blocks.length) return [];
  const assignments = await prisma.roomAssignment.findMany({
    where: {
      releasedAt: null,
      roomId: { in: [...new Set(blocks.map((b) => b.roomId))] },
      endDate: { gt: new Date(Date.now() - DAY) },
      stay: { reservation: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
    },
    select: {
      roomId: true,
      startDate: true,
      endDate: true,
      stay: { select: { reservation: { select: { id: true, guest: { select: { firstName: true, lastName: true } } } } } },
    },
  });
  const out: ChannelConflict[] = [];
  for (const b of blocks) {
    for (const a of assignments) {
      if (a.roomId === b.roomId && a.startDate < b.endDate && a.endDate > b.startDate) {
        const r = a.stay.reservation;
        out.push({
          roomNumber: b.room.roomNumber,
          source: b.connection.name,
          reservationId: r.id,
          guestName: `${r.guest.firstName} ${r.guest.lastName}`.trim(),
          start: a.startDate > b.startDate ? a.startDate : b.startDate,
          end: a.endDate < b.endDate ? a.endDate : b.endDate,
        });
      }
    }
  }
  return out;
}
