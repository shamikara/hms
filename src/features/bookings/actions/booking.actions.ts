"use server";

import { z } from "zod";
import prisma from "@/core/db/prisma";
import { BookingService, BookingError, RoomTypeAvailability } from "../services/booking.service";
import {
  BOOKING_RULE,
  callerAddress,
  consumeRateLimit,
  describeWait,
} from "@/core/security/rateLimit";
import { toBookingReference } from "../lib/reference";
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

export async function createPublicBooking(
  guestData: GuestFormValues,
  reservationData: Omit<ReservationFormValues, "guestId">
): Promise<ActionResult<{ reference: string; checkInDate: Date; checkOutDate: Date }>> {
  let parsedGuest;
  try {
    parsedGuest = GuestSchema.parse(guestData);
  } catch (error) {
    if (error instanceof z.ZodError) return { success: false, error: firstIssue(error) };
    throw error;
  }

  // A booking holds real inventory, so an unthrottled form can empty the
  // property. Checked after validation so malformed spam costs a database
  // round trip only once it looks like a real submission.
  const limit = await consumeRateLimit(`booking:ip:${await callerAddress()}`, BOOKING_RULE);
  if (!limit.allowed) {
    return {
      success: false,
      error: `That is a lot of requests from one place. Please wait ${describeWait(limit.retryAfterSeconds)}, or email us and we will book you in by hand.`,
    };
  }

  try {
    // One guest profile per email address. Upsert rather than find-then-create:
    // two tabs submitting at once would otherwise collide on the unique index.
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

    const parsedReservation = ReservationSchema.parse({
      ...reservationData,
      guestId: guest.id,
    });

    const reservation = await BookingService.createReservation(parsedReservation);

    // Only what the confirmation screen needs. The full row carries the
    // guest's record and the room ids, which the browser has no use for.
    return {
      success: true,
      data: {
        // The short form, so the reference the guest is shown is the one the
        // front desk can search for.
        reference: toBookingReference(reservation.id),
        checkInDate: reservation.checkInDate,
        checkOutDate: reservation.checkOutDate,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: firstIssue(error) };
    }
    // Lost the race for the last room, or asked for a type that is gone.
    if (error instanceof BookingError) {
      return { success: false, error: error.message };
    }
    console.error("createPublicBooking failed:", error);
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
