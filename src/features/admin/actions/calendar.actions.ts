"use server";

import prisma from "@/core/db/prisma";
import {
  requireAdminPermission,
  resolveDefaultPropertyId,
  NO_PROPERTY,
} from "@/features/admin/lib/requireAdminSession";
import { toBookingReference } from "@/features/bookings/lib/reference";

/**
 * The tape chart: rooms down the side, nights across the top.
 *
 * Built as a per-night lookup rather than as spans, which is exact here
 * because RoomAssignment_no_overlap guarantees a room holds at most one live
 * booking on any given night. Were that constraint ever dropped, this would
 * silently show only one of two overlapping bookings — so it is worth saying
 * that the two belong together.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** A quarter is as far ahead as a tape chart stays readable. */
const MAX_DAYS = 92;

export interface CalendarNight {
  reservationId: string;
  reference: string;
  guestName: string;
  /** Marks the first night, so the screen can label the block once. */
  isArrival: boolean;
  checkedIn: boolean;
}

export interface CalendarRow {
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  status: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER";
  housekeeping: "CLEAN" | "DIRTY" | "INSPECTED";
  /** Keyed by yyyy-mm-dd. Absent means the room is free that night. */
  nights: Record<string, CalendarNight>;
}

export interface OccupancyGrid {
  days: string[];
  rows: CalendarRow[];
  /** Rooms sold per night, against sellable rooms. */
  occupancy: { date: string; sold: number; sellable: number }[];
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parses yyyy-mm-dd as UTC midnight, matching how dates are stored. */
function fromIso(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function getOccupancyGrid(
  startDate?: string,
  days = 21,
  propertyId?: string,
): Promise<{ success: boolean; data?: OccupancyGrid; error?: string }> {
  const guard = await requireAdminPermission("reservations:view");
  if (!guard.ok) return guard.failure;

  try {
    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

    const span = Math.min(Math.max(Math.trunc(days), 1), MAX_DAYS);

    const start =
      startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)
        ? fromIso(startDate)
        : fromIso(toIso(new Date()));
    const end = new Date(start.getTime() + span * MS_PER_DAY);

    const dayList = Array.from({ length: span }, (_, i) => toIso(new Date(start.getTime() + i * MS_PER_DAY)));

    const [rooms, assignments] = await Promise.all([
      prisma.room.findMany({
        where: { deletedAt: null, floor: { building: { propertyId: propId } } },
        select: {
          id: true,
          roomNumber: true,
          status: true,
          housekeeping: true,
          roomType: { select: { name: true } },
        },
        orderBy: { roomNumber: "asc" },
      }),
      prisma.roomAssignment.findMany({
        where: {
          releasedAt: null,
          room: { deletedAt: null, floor: { building: { propertyId: propId } } },
          // Any assignment that overlaps the window at all.
          startDate: { lt: end },
          endDate: { gt: start },
        },
        select: {
          roomId: true,
          startDate: true,
          endDate: true,
          stay: {
            select: {
              status: true,
              reservation: {
                select: {
                  id: true,
                  status: true,
                  guest: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    const rows: CalendarRow[] = rooms.map((room) => ({
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomTypeName: room.roomType.name,
      status: room.status,
      housekeeping: room.housekeeping,
      nights: {},
    }));
    const byRoom = new Map(rows.map((row) => [row.roomId, row]));

    for (const assignment of assignments) {
      const row = byRoom.get(assignment.roomId);
      if (!row) continue;

      const reservation = assignment.stay.reservation;
      // Cancelled bookings should already be released; skip them if one slips
      // through rather than showing a room as sold that is not.
      if (reservation.status === "CANCELLED" || reservation.status === "NO_SHOW") continue;

      const guestName = `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim();
      const firstNight = toIso(assignment.startDate);

      // A stay occupies the nights from arrival up to, but not including, the
      // departure date — the night of checkout belongs to nobody.
      for (
        let cursor = new Date(Math.max(assignment.startDate.getTime(), start.getTime()));
        cursor < assignment.endDate && cursor < end;
        cursor = new Date(cursor.getTime() + MS_PER_DAY)
      ) {
        const key = toIso(cursor);
        row.nights[key] = {
          reservationId: reservation.id,
          reference: toBookingReference(reservation.id),
          guestName,
          isArrival: key === firstNight,
          checkedIn: assignment.stay.status === "CHECKED_IN",
        };
      }
    }

    const sellable = rows.filter((row) => row.status === "AVAILABLE").length;
    const occupancy = dayList.map((date) => ({
      date,
      sold: rows.filter((row) => row.nights[date]).length,
      sellable,
    }));

    return { success: true, data: { days: dayList, rows, occupancy } };
  } catch (error) {
    console.error("getOccupancyGrid failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Could not load the calendar." };
  }
}
