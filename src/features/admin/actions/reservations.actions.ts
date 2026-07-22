"use server";

import prisma from "@/core/db/prisma";
import { Reservation, ReservationStatus } from "@prisma/client";

export async function getAllReservations(propertyId?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const propId = propertyId || "resort_1";
    if (!propId) throw new Error("No property found");

    const reservations = await prisma.reservation.findMany({
      where: { propertyId: propId },
      include: {
        guest: true,
      },
      orderBy: { checkInDate: 'asc' },
    });

    return { success: true, data: reservations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateReservationStatus(reservationId: string, status: ReservationStatus): Promise<{ success: boolean; data?: Reservation; error?: string }> {
  try {
    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: { status },
    });
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
