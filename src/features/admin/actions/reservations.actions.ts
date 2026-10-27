"use server";

import prisma from "@/core/db/prisma";
import { requireAdminPermission, resolveDefaultPropertyId, NO_PROPERTY } from "@/features/admin/lib/requireAdminSession";
import { Reservation, ReservationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BookingService, BookingError, isRoomOverlapError } from "@/features/bookings/services/booking.service";
import { GuestSchema, ReservationSchema } from "@/features/bookings/validations/booking.schema";
import { toBookingReference } from "@/features/bookings/lib/reference";
import { FolioError, postRoomCharges } from "@/features/billing/services/folio.service";

/**
 * What the front desk sees for one reservation.
 *
 * A flat, already-serialisable view: Prisma hands back Decimals and Dates that
 * do not survive the boundary into a client component, and the raw rows carry
 * room ids and guest internals the browser has no use for.
 */
export interface DeskReservation {
  id: string;
  /** Short, readable form of the cuid, for reading out over the phone. */
  reference: string;
  guestName: string;
  email: string;
  phone: string | null;
  roomTypeNames: string[];
  roomNumbers: string[];
  /** ISO yyyy-mm-dd; formatting belongs to the screen, not the query. */
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  status: DeskStatus;
  /**
   * Rate times nights. Null when any room booked has no rate set, because a
   * partial total is worse than none. This is not an invoice — no invoice is
   * raised at booking time — and the screen labels it as an estimate.
   */
  estimatedTotal: number | null;
  currencyCode: string;
}

/**
 * The single status the desk cares about, flattened from two enums.
 *
 * ReservationStatus covers the agreement (DRAFT/CONFIRMED/CANCELLED/NO_SHOW)
 * and StayStatus covers the visit (PRE_ARRIVAL/CHECKED_IN/CHECKED_OUT). The
 * screen wants one answer, so the stay wins once it has started.
 */
export type DeskStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW";

const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export async function getDeskReservations(propertyId?: string): Promise<{ success: boolean; data?: DeskReservation[]; error?: string }> {
  const guard = await requireAdminPermission("reservations:view");
  if (!guard.ok) return guard.failure;

  try {
    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

    const [property, reservations] = await Promise.all([
      prisma.property.findUnique({
        where: { id: propId },
        select: { baseCurrency: true },
      }),
      prisma.reservation.findMany({
        where: { propertyId: propId },
        include: {
          guest: true,
          stays: {
            orderBy: { createdAt: "asc" },
            include: {
              roomAssignments: {
                include: { room: { include: { roomType: true } } },
              },
            },
          },
        },
        orderBy: { checkInDate: "asc" },
      }),
    ]);

    const currencyCode = property?.baseCurrency ?? "USD";

    const data: DeskReservation[] = reservations.map((reservation) => {
      const stay = reservation.stays[0];
      const assignments = stay?.roomAssignments ?? [];

      let status: DeskStatus;
      if (reservation.status === "CANCELLED") status = "CANCELLED";
      else if (reservation.status === "NO_SHOW") status = "NO_SHOW";
      else if (stay?.status === "CHECKED_OUT") status = "CHECKED_OUT";
      else if (stay?.status === "CHECKED_IN") status = "CHECKED_IN";
      else if (reservation.status === "CONFIRMED") status = "CONFIRMED";
      else status = "PENDING";

      const nights = Math.max(
        1,
        Math.round(
          (reservation.checkOutDate.getTime() - reservation.checkInDate.getTime()) / MS_PER_NIGHT,
        ),
      );

      const rates = assignments.map((a) => a.room.roomType.basePrice);
      const estimatedTotal =
        rates.length > 0 && rates.every((rate) => rate !== null)
          ? rates.reduce((sum, rate) => sum + Number(rate), 0) * nights
          : null;

      return {
        id: reservation.id,
        reference: toBookingReference(reservation.id),
        guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`.trim(),
        email: reservation.guest.email,
        phone: reservation.guest.phone,
        roomTypeNames: [...new Set(assignments.map((a) => a.room.roomType.name))],
        roomNumbers: assignments.map((a) => a.room.roomNumber),
        checkInDate: toIsoDate(reservation.checkInDate),
        checkOutDate: toIsoDate(reservation.checkOutDate),
        nights,
        status,
        estimatedTotal,
        currencyCode,
      };
    });

    return { success: true, data };
  } catch (error: any) {
    // Prisma messages name tables and columns; say nothing useful to a caller
    // who should not have reached this far anyway.
    console.error("getDeskReservations failed:", error?.message);
    return { success: false, error: "Could not load reservations." };
  }
}

export async function updateReservationStatus(reservationId: string, status: ReservationStatus): Promise<{ success: boolean; data?: Reservation; error?: string }> {
  const guard = await requireAdminPermission("reservations:manage");
  if (!guard.ok) return guard.failure;

  try {
    // Goes through the same helper as confirm/cancel so a status set through
    // this route cannot leave `releasedAt` disagreeing with it.
    const result = await setReservationStatus(reservationId, status);
    if (!result.success) return result;

    const updated = await prisma.reservation.findUnique({ where: { id: reservationId } });
    revalidatePath("/admin/bookings");
    return { success: true, data: updated ?? undefined };
  } catch (error: any) {
    console.error("updateReservationStatus failed:", error?.message);
    return { success: false, error: "Could not update the reservation." };
  }
}

/**
 * Marks a request as accepted. The public form stores reservations as DRAFT —
 * a request, not a booking — and this is the step that turns one into a
 * commitment the resort has made.
 */
/** Statuses under which a reservation has given its rooms back. */
const RELEASING_STATUSES: ReservationStatus[] = ["CANCELLED", "NO_SHOW"];

/**
 * Moves a reservation to a new status, keeping its room assignments in step.
 *
 * `RoomAssignment.releasedAt` mirrors this status so the database can police
 * room overlaps on its own (see migration 05). The two must move together or
 * a cancelled booking goes on blocking its room — hence one transaction, not
 * two updates.
 *
 * Reinstating can legitimately fail: if the room was rebooked while this one
 * was cancelled, RoomAssignment_no_overlap refuses, which is the database
 * doing its job rather than a fault.
 */
async function setReservationStatus(
  reservationId: string,
  status: ReservationStatus,
): Promise<{ success: boolean; error?: string }> {
  const releasing = RELEASING_STATUSES.includes(status);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status },
      });

      await tx.roomAssignment.updateMany({
        where: {
          stay: { reservationId },
          ...(releasing ? { releasedAt: null } : { NOT: { releasedAt: null } }),
        },
        data: { releasedAt: releasing ? new Date() : null },
      });
    });
    return { success: true };
  } catch (error) {
    if (!releasing && isRoomOverlapError(error)) {
      return {
        success: false,
        error: "That room has since been given to another guest, so this booking cannot be reinstated.",
      };
    }
    throw error;
  }
}

export async function confirmReservation(reservationId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAdminPermission("reservations:manage");
  if (!guard.ok) return guard.failure;

  try {
    const result = await setReservationStatus(reservationId, "CONFIRMED");
    if (!result.success) return result;
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    console.error("confirmReservation failed:", error?.message);
    return { success: false, error: "Could not confirm the reservation." };
  }
}

export async function cancelReservation(reservationId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAdminPermission("reservations:manage");
  if (!guard.ok) return guard.failure;

  try {
    const result = await setReservationStatus(reservationId, "CANCELLED");
    if (!result.success) return result;
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    console.error("cancelReservation failed:", error?.message);
    return { success: false, error: "Could not cancel the reservation." };
  }
}

/**
 * Records a guest's arrival against the Stay, not the Reservation.
 *
 * The two are separate in the schema for a reason: the reservation is the
 * agreement, the stay is what physically happened. CHECKED_IN is a StayStatus
 * and has no ReservationStatus equivalent.
 *
 * The room was assigned when the booking was taken, so this does not pick one.
 * Moving a guest to a different room is a separate operation and is not built.
 */
export async function checkInReservation(reservationId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAdminPermission("reservations:manage");
  if (!guard.ok) return guard.failure;

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        status: true,
        stays: {
          select: { id: true, status: true, _count: { select: { roomAssignments: true } } },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });

    if (!reservation) return { success: false, error: "That reservation no longer exists." };
    if (reservation.status === "CANCELLED" || reservation.status === "NO_SHOW") {
      return { success: false, error: "This reservation was cancelled and cannot be checked in." };
    }

    const stay = reservation.stays[0];
    if (!stay) return { success: false, error: "This reservation has no stay to check in." };
    if (stay.status !== "PRE_ARRIVAL") {
      return { success: false, error: "This guest has already been checked in." };
    }
    if (stay._count.roomAssignments === 0) {
      return { success: false, error: "No room is assigned to this reservation yet." };
    }

    await prisma.$transaction([
      prisma.stay.update({
        where: { id: stay.id },
        data: { status: "CHECKED_IN", actualArrival: new Date() },
      }),
      // An arriving guest has, by definition, confirmed.
      prisma.reservation.update({
        where: { id: reservationId },
        data: { status: "CONFIRMED" },
      }),
    ]);

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error: any) {
    console.error("checkInReservation failed:", error?.message);
    return { success: false, error: "Could not check the guest in." };
  }
}

export async function checkOutReservation(reservationId: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAdminPermission("reservations:manage");
  if (!guard.ok) return guard.failure;

  try {
    const stay = await prisma.stay.findFirst({
      where: { reservationId },
      select: {
        id: true,
        status: true,
        roomAssignments: { where: { releasedAt: null }, select: { roomId: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!stay) return { success: false, error: "This reservation has no stay to check out." };
    if (stay.status !== "CHECKED_IN") {
      return { success: false, error: "This guest is not currently checked in." };
    }

    // Charges are posted before the stay closes so a guest cannot leave
    // without a bill existing. Idempotent, so a retried check-out does not
    // bill twice. It throws when a room type has no rate — deliberately, since
    // the alternative is inventing a figure on a real invoice.
    try {
      await postRoomCharges(reservationId);
    } catch (error) {
      if (error instanceof FolioError) return { success: false, error: error.message };
      throw error;
    }

    const roomIds = stay.roomAssignments.map((a) => a.roomId);

    await prisma.$transaction([
      prisma.stay.update({
        where: { id: stay.id },
        data: { status: "CHECKED_OUT", actualDepart: new Date() },
      }),
      // The room the guest just left needs making up. Without this, check-out
      // left the room looking exactly as it did while they were asleep in it.
      prisma.room.updateMany({
        where: { id: { in: roomIds } },
        data: { housekeeping: "DIRTY" },
      }),
    ]);

    revalidatePath("/admin/bookings");
    revalidatePath(`/admin/bookings/${reservationId}`);
    revalidatePath("/admin/rooms");
    return { success: true };
  } catch (error: any) {
    console.error("checkOutReservation failed:", error?.message);
    return { success: false, error: "Could not check the guest out." };
  }
}

/**
 * Takes a guest who arrived without a booking and puts them in a room.
 *
 * Goes through the same BookingService as the public form rather than writing
 * rows directly, so a walk-in cannot be placed in a room the website has
 * already promised to someone else. The desk's own mistakes are caught by the
 * same serializable check.
 */
export async function createWalkInReservation(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
}): Promise<{ success: boolean; error?: string }> {
  const guard = await requireAdminPermission("reservations:manage");
  if (!guard.ok) return guard.failure;

  const propId = await resolveDefaultPropertyId();
  if (!propId) return { success: false, error: NO_PROPERTY };

  let parsedGuest;
  try {
    parsedGuest = GuestSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues?.[0]?.message ?? "Please check the guest details." };
    }
    throw error;
  }

  try {
    const guest = await prisma.guestProfile.upsert({
      where: { email: parsedGuest.email },
      update: {
        firstName: parsedGuest.firstName,
        lastName: parsedGuest.lastName,
        ...(parsedGuest.phone ? { phone: parsedGuest.phone } : {}),
      },
      create: {
        email: parsedGuest.email,
        firstName: parsedGuest.firstName,
        lastName: parsedGuest.lastName,
        phone: parsedGuest.phone ?? null,
      },
    });

    const reservation = await BookingService.createReservation(
      ReservationSchema.parse({
        propertyId: propId,
        guestId: guest.id,
        roomTypeIds: [input.roomTypeId],
        checkInDate: new Date(input.checkInDate),
        checkOutDate: new Date(input.checkOutDate),
        // A walk-in is standing at the desk; there is nothing to confirm later.
        status: "CONFIRMED",
      }),
    );

    const stay = reservation.stays[0];
    if (stay) {
      await prisma.stay.update({
        where: { id: stay.id },
        data: { status: "CHECKED_IN", actualArrival: new Date() },
      });
    }

    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues?.[0]?.message ?? "Please check the details." };
    }
    if (error instanceof BookingError) {
      return { success: false, error: error.message };
    }
    console.error("createWalkInReservation failed:", error);
    return { success: false, error: "Could not create the walk-in booking." };
  }
}

/**
 * One reservation, for the detail screen that carries the folio.
 *
 * Reuses the same shape the desk list uses so the two screens cannot drift in
 * how they describe a booking.
 */
export async function getDeskReservation(
  reservationId: string,
): Promise<{ success: boolean; data?: DeskReservation; error?: string }> {
  const guard = await requireAdminPermission("reservations:view");
  if (!guard.ok) return guard.failure;

  try {
    const propId = await resolveDefaultPropertyId();
    if (!propId) return { success: false, error: NO_PROPERTY };

    const all = await getDeskReservations(propId);
    if (!all.success || !all.data) return { success: false, error: all.error };

    const match = all.data.find((r) => r.id === reservationId);
    if (!match) return { success: false, error: "That reservation could not be found." };

    return { success: true, data: match };
  } catch (error: any) {
    console.error("getDeskReservation failed:", error?.message);
    return { success: false, error: "Could not load the reservation." };
  }
}
