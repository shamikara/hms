import prisma from "@/core/db/prisma";
import { AuditLogger } from "@/core/audit/AuditLogger";
import { toBookingReference } from "../lib/reference";

/** A refusal the desk should read, as opposed to a fault. */
export class BookingDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingDeletionError";
  }
}

/**
 * Statuses a booking may be deleted from: requests that never went ahead.
 * A CONFIRMED booking must be cancelled first, so a real reservation cannot
 * disappear with one click; that extra step is the safety catch.
 */
const DELETABLE = new Set(["DRAFT", "CANCELLED", "NO_SHOW"]);

export const BookingDeletionService = {
  /**
   * Permanently removes a test or mistaken booking.
   *
   * Refuses anything that left a trace a business must keep: a stay that was
   * checked in or out, a bill, or a safari booked against it. Those are
   * cancelled, not deleted. Everything else (the reservation, its stay and
   * its room assignments) goes, which frees the room. The guest record goes
   * too if this booking was its only use, so test entries leave nothing
   * behind in the guest list.
   *
   * A snapshot is written to the audit log in the same transaction: the row is
   * gone, but the fact that it existed, and who removed it, is not.
   */
  async delete(reservationId: string, propertyId: string, actorUserId: string) {
    await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findFirst({
        where: { id: reservationId, propertyId },
        include: {
          guest: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
          stays: {
            select: {
              id: true,
              status: true,
              _count: { select: { invoices: true, safariBookings: true } },
              roomAssignments: { select: { room: { select: { roomNumber: true } } } },
            },
          },
          _count: { select: { invoices: true } },
        },
      });
      if (!reservation) throw new BookingDeletionError("That booking was not found.");

      if (!DELETABLE.has(reservation.status)) {
        throw new BookingDeletionError("Cancel this booking first. Only pending or cancelled bookings can be deleted.");
      }
      if (reservation.stays.some((s) => s.status !== "PRE_ARRIVAL")) {
        throw new BookingDeletionError("This guest has checked in, so the booking is part of the records and cannot be deleted.");
      }
      if (reservation._count.invoices > 0 || reservation.stays.some((s) => s._count.invoices > 0)) {
        throw new BookingDeletionError("This booking has a bill on it, so it cannot be deleted. Cancel it instead.");
      }
      if (reservation.stays.some((s) => s._count.safariBookings > 0)) {
        throw new BookingDeletionError("A safari is booked against this stay. Remove the safari first.");
      }

      await AuditLogger.log(tx, actorUserId, "DELETE", "Reservation", reservation.id, {
        reference: toBookingReference(reservation.id),
        status: reservation.status,
        guest: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
        email: reservation.guest.email,
        checkInDate: reservation.checkInDate.toISOString().slice(0, 10),
        checkOutDate: reservation.checkOutDate.toISOString().slice(0, 10),
        rooms: reservation.stays.flatMap((s) => s.roomAssignments.map((a) => a.room.roomNumber)),
        createdAt: reservation.createdAt.toISOString(),
      }, null);

      const stayIds = reservation.stays.map((s) => s.id);
      // Assignments cascade with their stay, but deleting them first makes the
      // order explicit and does not lean on a cascade someone may later change.
      await tx.roomAssignment.deleteMany({ where: { stayId: { in: stayIds } } });
      await tx.stay.deleteMany({ where: { id: { in: stayIds } } });
      await tx.reservation.delete({ where: { id: reservation.id } });

      // Remove the guest only if nothing else refers to them: no other
      // booking, no sign-in, no safari trip or review.
      const guest = reservation.guest;
      if (!guest.userId) {
        const [bookings, trips, reviews] = await Promise.all([
          tx.reservation.count({ where: { guestId: guest.id } }),
          tx.safariTrip.count({ where: { guestId: guest.id } }),
          tx.safariReview.count({ where: { guestId: guest.id } }),
        ]);
        if (bookings + trips + reviews === 0) {
          await tx.guestProfile.delete({ where: { id: guest.id } });
        }
      }
    });
  },
};
