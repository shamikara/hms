import { NextResponse } from "next/server";
import prisma from "@/core/db/prisma";
import { buildIcal } from "@/features/channels/lib/ical";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

/**
 * The calendar Booking.com / Agoda read for one room: every night held here,
 * plus nights sold on the room's *other* sites (so Agoda also learns about a
 * Booking.com booking). The site reading it never gets its own bookings back,
 * which would otherwise keep cancelled dates closed.
 *
 * Only dates leave this server, never guest details. The token in the URL is
 * the only key, so it is long and random; staff can replace it in the admin.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const clean = token.replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(clean)) return new NextResponse("Not found", { status: 404 });

  const conn = await prisma.calendarConnection.findUnique({
    where: { exportToken: clean },
    select: { id: true, roomId: true, room: { select: { roomNumber: true, roomType: { select: { name: true } } } } },
  });
  if (!conn) return new NextResponse("Not found", { status: 404 });

  const from = new Date(Date.now() - 2 * DAY);
  const [assignments, otherBlocks] = await Promise.all([
    prisma.roomAssignment.findMany({
      where: {
        roomId: conn.roomId,
        releasedAt: null,
        endDate: { gt: from },
        stay: { reservation: { status: { notIn: ["CANCELLED", "NO_SHOW"] } } },
      },
      select: { id: true, startDate: true, endDate: true },
    }),
    prisma.externalBlock.findMany({
      where: { roomId: conn.roomId, connectionId: { not: conn.id }, endDate: { gt: from } },
      select: { id: true, startDate: true, endDate: true },
    }),
  ]);

  const body = buildIcal({
    calendarName: `${conn.room.roomType.name} ${conn.room.roomNumber}`,
    events: [
      ...assignments.map((a) => ({ uid: `stay-${a.id}@wildlilysafariresort.com`, start: a.startDate, end: a.endDate })),
      ...otherBlocks.map((b) => ({ uid: `block-${b.id}@wildlilysafariresort.com`, start: b.startDate, end: b.endDate })),
    ],
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="room-${conn.room.roomNumber}.ics"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
