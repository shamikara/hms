"use server";

import { syncStaleConnections } from "@/features/channels/services/channel-sync.service";
import { z } from "zod";
import { after } from "next/server";
import prisma from "@/core/db/prisma";
import { BookingService, BookingError, RoomTypeAvailability } from "../services/booking.service";
import {
  BOOKING_RULE,
  callerAddress,
  consumeRateLimit,
  describeWait,
} from "@/core/security/rateLimit";
import { toBookingReference } from "../lib/reference";
import { SAFARI_OPTIONS, safariLabel } from "../lib/safari";
import { notifyBookingRequest } from "@/features/notifications/services/booking-notifications";
import { PAY_CHOICES } from "@/features/payments/validations/payment.schema";
import { publicPaymentOptions } from "@/features/payments/services/payment-settings.service";
import { OnlinePaymentError, startCheckout, sweepStaleAttempts } from "@/features/payments/services/online-payment.service";
import {
  GuestFormValues,
  ReservationFormValues,
  GuestSchema,
  ReservationSchema,
  AvailabilitySchema,
} from "../validations/booking.schema";

export type RoomAvailability = RoomTypeAvailability;

type ActionResult<T> = { success: boolean; data?: T; error?: string };

/**
 * Message shown when something failed on our side.
 *
 * These actions used to answer an unreachable database with a fabricated
 * confirmation — a `DEMO-RES-...` id, a "we'll email you shortly", and nothing
 * written anywhere. A guest who is told their room is held will turn up. If we
 * cannot take the booking, we have to say so.
 */
const UNAVAILABLE =
  "We could not reach the reservations system just now. Please try again in a moment, or email us and we will book you in by hand.";

/** Turns a validation failure into the first readable message it produced. */
function firstIssue(error: z.ZodError): string {
  return error.issues?.[0]?.message ?? "Please check the details and try again.";
}

/** Optional safari the guest added in the booking form. */
const ExtrasSchema = z
  .object({
    safari: z.enum(SAFARI_OPTIONS.map((o) => o.value) as [string, ...string[]]).nullable().optional(),
    driverId: z.string().min(1).max(64).nullable().optional(),
  })
  .optional();

type Placed = {
  reservation: Awaited<ReturnType<typeof BookingService.createReservation>>;
  guest: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  reference: string;
  roomTypeNames: string[];
  guests: number | null;
  safari: { label: string; driverName: string | null } | null;
};

/**
 * Validates, rate-limits and stores a public booking as a held DRAFT. Shared
 * by the request flow and the pay-now flow; sends nothing.
 */
async function placePublicBooking(
  guestData: GuestFormValues,
  reservationData: Omit<ReservationFormValues, "guestId" | "status">,
  partySize?: number,
  extras?: unknown,
): Promise<{ ok: true; placed: Placed } | { ok: false; error: string }> {
  // The same date rules the availability search applies. Without this a
  // hand-built request could book a stay in the past.
  const dates = AvailabilitySchema.safeParse({
    checkInDate: reservationData.checkInDate,
    checkOutDate: reservationData.checkOutDate,
  });
  if (!dates.success) return { ok: false, error: firstIssue(dates.error) };

  const parsedGuest = GuestSchema.safeParse(guestData);
  if (!parsedGuest.success) return { ok: false, error: firstIssue(parsedGuest.error) };

  const parsedExtras = ExtrasSchema.safeParse(extras);
  if (!parsedExtras.success) return { ok: false, error: "Please choose a safari option again." };
  const safari = parsedExtras.data?.safari ?? null;
  // A driver only counts if they are a real, active driver on the public list.
  const driver =
    safari && parsedExtras.data?.driverId
      ? await prisma.safariDriver.findFirst({
          where: { id: parsedExtras.data.driverId, isActive: true, deletedAt: null, employmentStatus: "ACTIVE" },
          select: { id: true, employee: { select: { firstName: true, lastName: true } } },
        })
      : null;

  // A booking holds real inventory, so an unthrottled form can empty the
  // property. Checked after validation so malformed spam costs a database
  // round trip only once it looks like a real submission.
  const limit = await consumeRateLimit(`booking:ip:${await callerAddress()}`, BOOKING_RULE);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `That is a lot of requests from one place. Please wait ${describeWait(limit.retryAfterSeconds)}, or email us and we will book you in by hand.`,
    };
  }

  // Re-read Booking.com / Agoda just before holding a room, in case a room
  // was sold there since the guest searched.
  await syncStaleConnections({ maxAgeMs: 5 * 60 * 1000 });

  try {
    // One guest profile per email address. Upsert rather than find-then-create:
    // two tabs submitting at once would otherwise collide on the unique index.
    const guest = await prisma.guestProfile.upsert({
      where: { email: parsedGuest.data.email },
      update: {
        firstName: parsedGuest.data.firstName,
        lastName: parsedGuest.data.lastName,
        ...(parsedGuest.data.phone ? { phone: parsedGuest.data.phone } : {}),
      },
      create: {
        email: parsedGuest.data.email,
        firstName: parsedGuest.data.firstName,
        lastName: parsedGuest.data.lastName,
        phone: parsedGuest.data.phone ?? null,
      },
    });

    // Status is set here, never taken from the browser: a public booking is
    // always a DRAFT until the desk confirms it or the payment clears.
    // Spreading the client payload let anyone submit a CONFIRMED booking
    // straight past the front desk.
    const parsedReservation = ReservationSchema.parse({
      propertyId: reservationData.propertyId,
      roomTypeIds: reservationData.roomTypeIds,
      checkInDate: reservationData.checkInDate,
      checkOutDate: reservationData.checkOutDate,
      guestId: guest.id,
      status: "DRAFT",
    });

    const reservation = await BookingService.createReservation(parsedReservation);
    if (safari) {
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: { safariRequest: safari, requestedDriverId: driver?.id ?? null },
      });
    }
    return {
      ok: true,
      placed: {
        reservation,
        guest,
        reference: toBookingReference(reservation.id),
        roomTypeNames: reservation.stays.flatMap((stay) => stay.roomAssignments.map((a) => a.room.roomType.name)),
        guests: Number.isInteger(partySize) && partySize! >= 1 && partySize! <= 20 ? partySize! : null,
        safari: safari
          ? {
              label: safariLabel(safari)!,
              driverName: driver ? `${driver.employee.firstName} ${driver.employee.lastName}`.trim() : null,
            }
          : null,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) return { ok: false, error: firstIssue(error) };
    // Lost the race for the last room, or asked for a type that is gone.
    if (error instanceof BookingError) return { ok: false, error: error.message };
    console.error("placePublicBooking failed:", error);
    return { ok: false, error: UNAVAILABLE };
  }
}

export async function createPublicBooking(
  guestData: GuestFormValues,
  reservationData: Omit<ReservationFormValues, "guestId" | "status">,
  /** Party size from the booking form; only used in the alert email. */
  partySize?: number,
  /** Optional safari add-on: { safari, driverId }. */
  extras?: unknown,
): Promise<ActionResult<{ reference: string; checkInDate: Date; checkOutDate: Date }>> {
  const result = await placePublicBooking(guestData, reservationData, partySize, extras);
  if (!result.ok) return { success: false, error: result.error };
  const { reservation, guest, reference, roomTypeNames, guests, safari } = result.placed;

  // Sent after the response, so the guest is not kept waiting on the mail
  // provider, and a send that fails cannot undo a booking already stored.
  after(() =>
    notifyBookingRequest({
      reservationId: reservation.id,
      reference,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      roomTypeNames,
      guests,
      safari,
      guest: { firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone },
    }),
  );

  // Only what the confirmation screen needs. The full row carries the
  // guest's record and the room ids, which the browser has no use for.
  return {
    success: true,
    data: { reference, checkInDate: reservation.checkInDate, checkOutDate: reservation.checkOutDate },
  };
}

/**
 * Books and sends the guest to the Payments.lk card page.
 *
 * The room is held as a draft for the length of the checkout. Nothing is
 * emailed yet: the confirmation goes out when the payment is verified, or the
 * request emails if the guest backs out and keeps it as a request.
 */
export async function startPaidBooking(
  guestData: GuestFormValues,
  reservationData: Omit<ReservationFormValues, "guestId" | "status">,
  partySize: number | undefined,
  choice: unknown,
  extras?: unknown,
): Promise<ActionResult<{ checkoutUrl: string }>> {
  const payChoice = z.enum(PAY_CHOICES).safeParse(choice);
  if (!payChoice.success) return { success: false, error: "Choose how much to pay now." };

  const property = await prisma.property.findFirst({
    where: { id: reservationData.propertyId, deletedAt: null },
    select: { id: true, baseCurrency: true },
  });
  if (!property) return { success: false, error: UNAVAILABLE };
  const options = await publicPaymentOptions(property.id);
  if (!options.payNow) {
    return { success: false, error: "Online payment isn't available at the moment. Please send your booking as a request." };
  }

  const result = await placePublicBooking(guestData, reservationData, partySize, extras);
  if (!result.ok) return { success: false, error: result.error };
  const { reservation, guest } = result.placed;

  try {
    const { url } = await startCheckout({
      reservationId: reservation.id,
      propertyId: property.id,
      checkInDate: reservation.checkInDate,
      choice: payChoice.data,
      advancePercent: options.advancePercent,
      freeCancelDays: options.freeCancelDays,
      currency: property.baseCurrency,
      guest: { firstName: guest.firstName, lastName: guest.lastName, email: guest.email, phone: guest.phone },
    });
    return { success: true, data: { checkoutUrl: url } };
  } catch (error) {
    if (error instanceof OnlinePaymentError) return { success: false, error: error.message };
    console.error("startPaidBooking failed:", error);
    return { success: false, error: UNAVAILABLE };
  }
}

export async function checkAvailability(
  propertyId: string,
  checkInDate: Date,
  checkOutDate: Date
): Promise<ActionResult<RoomAvailability[]>> {
  const parsed = AvailabilitySchema.safeParse({ checkInDate, checkOutDate });
  if (!parsed.success) {
    return { success: false, error: firstIssue(parsed.error) };
  }

  // Lets go of rooms held by checkouts that were never paid and whose
  // webhook went missing, so they show as free again. In the background.
  after(() => sweepStaleAttempts().catch(() => undefined));

  // Fresh Booking.com / Agoda dates before answering (waits at most ~4s).
  await syncStaleConnections();

  try {
    const availability = await BookingService.getAvailability(
      propertyId,
      parsed.data.checkInDate,
      parsed.data.checkOutDate
    );
    // An empty list means this property has no room types set up — a real
    // answer, and one the screen should show plainly rather than filling in.
    return { success: true, data: availability };
  } catch (error) {
    console.error("checkAvailability failed:", error);
    return { success: false, error: UNAVAILABLE };
  }
}

/**
 * The property the public booking screen takes reservations for.
 *
 * The page previously hardcoded `{ id: "resort_1" }`, which matches no row, so
 * every availability lookup ran against a property that does not exist. Reads
 * the oldest property, matching how the admin screens resolve a default.
 */
export async function getBookableProperty(): Promise<
  ActionResult<{ id: string; name: string; baseCurrency: string }>
> {
  try {
    const property = await prisma.property.findFirst({
      where: { deletedAt: null },
      select: { id: true, name: true, baseCurrency: true },
      orderBy: { createdAt: "asc" },
    });

    if (!property) {
      return { success: false, error: UNAVAILABLE };
    }
    return { success: true, data: property };
  } catch (error) {
    console.error("getBookableProperty failed:", error);
    return { success: false, error: UNAVAILABLE };
  }
}
