import prisma from "@/core/db/prisma";
import { Prisma, PrismaClient } from "@prisma/client";
import { ReservationFormValues } from "../validations/booking.schema";

/**
 * Either the singleton client or a transaction handle. Every method takes one
 * so the availability check and the write that depends on it can run inside
 * the same transaction — checking availability on one connection and writing
 * on another is how two guests end up in one room.
 */
type Db = PrismaClient | Prisma.TransactionClient;

export const BookingRepository = {
  /** Active, bookable room types for a property. */
  async getRoomTypes(propertyId: string, db: Db = prisma) {
    return db.roomType.findMany({
      where: { propertyId, deletedAt: null },
      select: {
        id: true,
        name: true,
        description: true,
        capacity: true,
        basePrice: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async getAvailableRooms(
    propertyId: string,
    roomTypeIds: string[],
    checkInDate: Date,
    checkOutDate: Date,
    db: Db = prisma
  ) {
    // 1. Find all rooms of the requested types in the property
    const allRooms = await db.room.findMany({
      where: {
        roomTypeId: { in: roomTypeIds },
        floor: { building: { propertyId } },
        status: "AVAILABLE", // Not out of order or in maintenance
        deletedAt: null,
      },
      include: { roomType: true },
      // Stable order so two concurrent callers see the same list; which room
      // each then picks is randomised in the service.
      orderBy: { id: "asc" },
    });

    // 2. Find any conflicting RoomAssignments
    const conflictingAssignments = await db.roomAssignment.findMany({
      where: {
        roomId: { in: allRooms.map(r => r.id) },
        // `releasedAt` is the same condition the RoomAssignment_no_overlap
        // constraint uses, so the application and the database agree on which
        // assignments still hold a room. The reservation status check behind
        // it is belt and braces: the two should never disagree, and if they do
        // the safer reading wins.
        releasedAt: null,
        stay: {
          reservation: {
            status: { notIn: ["CANCELLED", "NO_SHOW"] },
          },
        },
        OR: [
          {
            startDate: { lt: checkOutDate },
            endDate: { gt: checkInDate },
          },
        ],
      },
    });

    const conflictingRoomIds = new Set(conflictingAssignments.map(a => a.roomId));

    // 3. Filter out unavailable rooms
    return allRooms.filter(room => !conflictingRoomIds.has(room.id));
  },

  async createReservation(data: ReservationFormValues, assignedRoomIds: string[], db: Db = prisma) {
    // We create a Reservation, a Stay, and RoomAssignments in a single transaction.
    return db.reservation.create({
      data: {
        propertyId: data.propertyId,
        guestId: data.guestId,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        status: data.status,
        stays: {
          create: {
            status: "PRE_ARRIVAL",
            roomAssignments: {
              create: assignedRoomIds.map(roomId => ({
                roomId,
                startDate: data.checkInDate,
                endDate: data.checkOutDate,
              })),
            },
          },
        },
      },
      include: {
        guest: true,
        stays: {
          include: {
            roomAssignments: {
              include: { room: { include: { roomType: true } } },
            },
          },
        },
      },
    });
  },
};
