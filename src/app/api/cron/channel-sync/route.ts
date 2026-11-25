import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { syncStaleConnections } from "@/features/channels/services/channel-sync.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled re-read of every Booking.com / Agoda calendar link.
 *
 * Called by Vercel Cron (see vercel.json) or any outside scheduler such as
 * cron-job.org, with the header  Authorization: Bearer <CRON_SECRET>.
 * Without CRON_SECRET set, the route does nothing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  await syncStaleConnections({ maxAgeMs: 10 * 60 * 1000, budgetMs: 50_000 });
  return NextResponse.json({ ok: true });
}
