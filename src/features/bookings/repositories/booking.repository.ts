import prisma from "@/core/db/prisma";
import { ReservationFormValues } from "../validations/booking.schema";

export const BookingRepository = {
  async getAvailableRooms(propertyId: string, roomTypeIds: string[], checkInDate: Date, checkOutDate: Date) {
    // 1. Find all rooms of the requested types in the property
    const allRooms = await prisma.room.findMany({
      where: {
        roomTypeId: { in: roomTypeIds },
        floor: { building: { propertyId } },
        status: "AVAILABLE", // Not out of order or in maintenance
      },
      include: { roomType: true },
    });

    // 2. Find any conflicting RoomAssignments
    const conflictingAssignments = await prisma.roomAssignment.findMany({
      where: {
        roomId: { in: allRooms.map(r => r.id) },
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

  async createReservation(data: ReservationFormValues, assignedRoomIds: string[]) {
    // We create a Reservation, a Stay, and RoomAssignments in a single transaction.
    return prisma.reservation.create({
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
