import { Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";
import { BookingRepository } from "../repositories/booking.repository";
import { ReservationFormValues } from "../validations/booking.schema";

/**
 * A booking that failed for a reason the guest should be told about — the
 * dates are gone, the room type is unknown — as opposed to a fault on our
 * side. Only this message is ever shown to a guest; anything else becomes a
 * generic apology, because Prisma's messages name tables and columns.
 */
export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

/** Shown whenever the room went while the guest was deciding. */
const ROOM_TAKEN =
  "One or more of the rooms you chose has just been taken for those dates. Please check availability again.";

/**
 * Postgres SQLSTATEs that mean "two bookings collided", not "something broke".
 *
 *   40001 serialization_failure  - SERIALIZABLE aborted one of the pair
 *   40P01 deadlock_detected      - they locked each other out
 *   23P01 exclusion_violation    - RoomAssignment_no_overlap refused the write
 *
 * All three are safe and sensible to retry: re-running re-reads availability,
 * so the retry either picks a different room or correctly reports none left.
 */
const CONFLICT_SQLSTATES = new Set(["40001", "40P01", "23P01"]);

/** How many times to run the transaction before giving up. */
const MAX_ATTEMPTS = 3;

/**
 * True when an error is a booking collision rather than a fault.
 *
 * Prisma reports a serialization failure as P2034, but an exclusion-constraint
 * violation has no dedicated Prisma code and arrives from the pg driver with
 * its SQLSTATE in varying places depending on how it was raised. Rather than
 * depend on one shape, this looks for the code anywhere in the error chain and
 * falls back to the constraint name.
 */
function isBookingConflict(error: unknown): boolean {
  return matchesConflict(error, CONFLICT_SQLSTATES);
}

/**
 * True when the RoomAssignment_no_overlap constraint refused a write — the
 * room is already spoken for over those dates.
 *
 * Exported because the admin actions need the same answer when reinstating a
 * cancelled booking, and two copies of this would eventually disagree.
 */
export function isRoomOverlapError(error: unknown): boolean {
  return matchesConflict(error, new Set(["23P01"]));
}

function matchesConflict(error: unknown, codes: Set<string>): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as { code?: unknown; meta?: unknown; cause?: unknown; message?: unknown };

    if (codes.has("40001") && candidate.code === "P2034") return true;
    if (typeof candidate.code === "string" && codes.has(candidate.code)) return true;
    if (typeof candidate.message === "string" && candidate.message.includes("RoomAssignment_no_overlap")) {
      return true;
    }

    current = candidate.cause ?? candidate.meta;
  }

  return false;
}

/** Short randomised pause, so two retrying transactions do not collide again. */
function backoff(attempt: number): Promise<void> {
  const base = 25 * attempt;
  return new Promise((resolve) => setTimeout(resolve, base + Math.random() * base));
}

export interface RoomTypeAvailability {
  roomType: {
    id: string;
    name: string;
    description: string | null;
    /** Nightly rate, or null when none is set — never a stand-in number. */
    basePrice: number | null;
    capacity: number;
  };
  availableCount: number;
}

export const BookingService = {
  /**
   * Rooms free for the whole window, counted per room type.
   *
   * A type with nothing free is returned with a count of zero rather than
   * omitted, so the screen can say "none left on these dates" instead of
   * quietly shortening the list.
   */
  async getAvailability(
    propertyId: string,
    checkInDate: Date,
    checkOutDate: Date
  ): Promise<RoomTypeAvailability[]> {
    const roomTypes = await BookingRepository.getRoomTypes(propertyId);
    if (roomTypes.length === 0) return [];

    const availableRooms = await BookingRepository.getAvailableRooms(
      propertyId,
      roomTypes.map((rt) => rt.id),
      checkInDate,
      checkOutDate
    );

    const countByType = new Map<string, number>();
    for (const room of availableRooms) {
      countByType.set(room.roomTypeId, (countByType.get(room.roomTypeId) ?? 0) + 1);
    }

    return roomTypes.map((rt) => ({
      roomType: {
        id: rt.id,
        name: rt.name,
        description: rt.description,
        // Decimal does not survive the server/client boundary, and the guest
        // is only ever shown this to two places anyway.
        basePrice: rt.basePrice === null ? null : Number(rt.basePrice),
        capacity: rt.capacity,
      },
      availableCount: countByType.get(rt.id) ?? 0,
    }));
  },

  /**
   * Creates the reservation, holding a room of each requested type.
   *
   * The availability check and the write run in one serializable transaction,
   * and the RoomAssignment_no_overlap constraint backs that up in the database
   * itself. Between them, two guests cannot end up in one room.
   *
   * A collision is retried rather than reported: losing a race is not the
   * guest's problem, and re-running re-reads availability, so the retry takes
   * a different room if there is one. Only once the retries are spent does it
   * become an error, and then it says the room has gone rather than blaming
   * the system.
   */
  async createReservation(data: ReservationFormValues) {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.attemptReservation(data);
      } catch (error) {
        // Genuinely nothing free; retrying would find the same answer.
        if (error instanceof BookingError) throw error;
        if (!isBookingConflict(error)) throw error;

        if (attempt >= MAX_ATTEMPTS) {
          // Every attempt collided. Something is free in theory but we keep
          // losing the race, so tell the guest the truth about the room.
          throw new BookingError(ROOM_TAKEN);
        }
        await backoff(attempt);
      }
    }
  },

  /** One pass at taking the booking. See {@link createReservation}. */
  async attemptReservation(data: ReservationFormValues) {
    return prisma.$transaction(
      async (tx) => {
        const availableRooms = await BookingRepository.getAvailableRooms(
          data.propertyId,
          data.roomTypeIds,
          data.checkInDate,
          data.checkOutDate,
          tx
        );

        // Group available rooms by type to easily pick one. The rate is taken
        // now, with the booking, rather than read off the room type again at
        // check-out — by then it may have been repriced, and the guest agreed
        // to the figure that was showing today.
        const roomsByType = availableRooms.reduce((acc, room) => {
          if (!acc[room.roomTypeId]) acc[room.roomTypeId] = [];
          acc[room.roomTypeId].push({ roomId: room.id, ratePerNight: room.roomType.basePrice });
          return acc;
        }, {} as Record<string, { roomId: string; ratePerNight: Prisma.Decimal | null }[]>);

        // Pick one room for each requested type.
        const assignedRooms: { roomId: string; ratePerNight: Prisma.Decimal | null }[] = [];
        for (const typeId of data.roomTypeIds) {
          const pool = roomsByType[typeId];
          if (!pool || pool.length === 0) {
            throw new BookingError(ROOM_TAKEN);
          }
          // Chosen at random, and removed from the pool so the same room is
          // not handed out twice when one type is requested twice.
          //
          // Taking the first or last free room instead would make two
          // simultaneous bookers reach for the same one every time, and the
          // database would reject a booking even with rooms to spare.
          const [room] = pool.splice(Math.floor(Math.random() * pool.length), 1);
          assignedRooms.push(room);
        }

        return BookingRepository.createReservation(data, assignedRooms, tx);
      },
      { isolationLevel: "Serializable" }
    );
  },
};
