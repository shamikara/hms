import prisma from "@/core/db/prisma";
import { BookingFormValues } from "../validations/booking.schema";

export const BookingRepository = {
  async findConflictingBookings(roomIds: string[], checkInDate: Date, checkOutDate: Date) {
    return prisma.roomBooking.findMany({
      where: {
        roomId: { in: roomIds },
        booking: {
          status: { notIn: ["CANCELLED"] },
          OR: [
            {
              checkInDate: { lt: checkOutDate },
              checkOutDate: { gt: checkInDate },
            },
          ],
        },
      },
    });
  },

  async calculateTotalAmount(roomIds: string[], checkInDate: Date, checkOutDate: Date): Promise<number> {
    const rooms = await prisma.room.findMany({
      where: { id: { in: roomIds } },
      include: { roomType: true },
    });

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return rooms.reduce((sum, room) => sum + (room.roomType.basePrice * nights), 0);
  },

  async createBooking(data: BookingFormValues & { totalAmount: number }) {
    return prisma.booking.create({
      data: {
        guestId: data.guestId,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        status: data.status,
        notes: data.notes,
        totalAmount: data.totalAmount,
        roomBookings: {
          create: data.roomIds.map(roomId => ({ roomId })),
        },
      },
      include: {
        roomBookings: true,
        guest: true,
      },
    });
  },
};
