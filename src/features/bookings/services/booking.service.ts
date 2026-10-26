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
   * The availability check and the write run in one serializable transaction:
   * checking first and writing afterwards leaves a window in which two guests
   * are each told the last room is theirs. Postgres aborts the loser, and the
   * caller sees an ordinary "no longer available" error.
   */
  async createReservation(data: ReservationFormValues) {
    return prisma.$transaction(
      async (tx) => {
        const availableRooms = await BookingRepository.getAvailableRooms(
          data.propertyId,
          data.roomTypeIds,
          data.checkInDate,
          data.checkOutDate,
          tx
        );

        // Group available rooms by type to easily pick one
        const roomsByType = availableRooms.reduce((acc, room) => {
          if (!acc[room.roomTypeId]) acc[room.roomTypeId] = [];
          acc[room.roomTypeId].push(room.id);
          return acc;
        }, {} as Record<string, string[]>);

        // Pick one room for each requested type
        const assignedRoomIds: string[] = [];
        for (const typeId of data.roomTypeIds) {
          // Pop an available room so it's not double-assigned if the same type is requested twice
          const roomId = roomsByType[typeId]?.pop();
          if (!roomId) {
            throw new BookingError(
              "One or more of the rooms you chose has just been taken for those dates. Please check availability again."
            );
          }
          assignedRoomIds.push(roomId);
        }

        return BookingRepository.createReservation(data, assignedRoomIds, tx);
      },
      { isolationLevel: "Serializable" }
    );
  },
};
