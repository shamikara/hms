"use server";

import prisma from "@/core/db/prisma";
import { BookingService } from "../services/booking.service";
import { GuestFormValues, ReservationFormValues, GuestSchema, ReservationSchema } from "../validations/booking.schema";
import { Reservation, RoomType } from "@prisma/client";

export async function createPublicBooking(
  guestData: GuestFormValues,
  reservationData: Omit<ReservationFormValues, "guestId">
): Promise<{ success: boolean; data?: Reservation; error?: string }> {
  try {
    // 1. Validate inputs
    const parsedGuest = GuestSchema.parse(guestData);
    
    // 2. Find or Create Guest
    let guest = await prisma.guestProfile.findUnique({
      where: { email: parsedGuest.email },
    });

    if (!guest) {
      guest = await prisma.guestProfile.create({
        data: {
          email: parsedGuest.email,
          firstName: parsedGuest.firstName,
          lastName: parsedGuest.lastName,
        },
      });
    }

    // 3. Validate reservation data with the new guestId
    const fullReservationData = {
      ...reservationData,
      guestId: guest.id,
    };
    const parsedReservation = ReservationSchema.parse(fullReservationData);

    // 4. Delegate to Service
    const reservation = await BookingService.createReservation(parsedReservation);

    return { success: true, data: reservation };
  } catch (error: any) {
    console.error("Booking Error:", error);
    return { success: false, error: error.message || "Failed to create booking" };
  }
}

export type RoomAvailability = {
  roomType: RoomType;
  availableCount: number;
};

export async function checkAvailability(propertyId: string, checkInDate: Date, checkOutDate: Date): Promise<{ success: boolean; data?: RoomAvailability[]; error?: string }> {
  try {
    // Return all room types and their available count
    const allRoomTypes = await prisma.roomType.findMany({
      where: { propertyId },
      include: { rooms: true },
    });

    const availability = await Promise.all(allRoomTypes.map(async (rt) => {
      const availableRooms = await prisma.room.findMany({
        where: {
          roomTypeId: rt.id,
          status: "AVAILABLE",
          NOT: {
            assignments: {
              some: {
                stay: {
                  reservation: {
                    status: { notIn: ["CANCELLED", "NO_SHOW"] }
                  }
                },
                OR: [
                  {
                    startDate: { lt: checkOutDate },
                    endDate: { gt: checkInDate }
                  }
                ]
              }
            }
          }
        }
      });
      return {
        roomType: rt,
        availableCount: availableRooms.length,
      };
    }));

    return { success: true, data: availability };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to check availability" };
  }
}
