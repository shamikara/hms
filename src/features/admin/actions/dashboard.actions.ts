"use server";

import prisma from "@/core/db/prisma";
import { startOfDay, endOfDay } from "date-fns";

export async function getDashboardMetrics(propertyId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    // If no propertyId is provided, we can fetch the first one as a default for the prototype
    const propId = propertyId || "resort_1";
    if (!propId) throw new Error("No property found");

    const [todayArrivals, pendingReservations, totalGuests] = await Promise.all([
      prisma.reservation.count({
        where: {
          propertyId: propId,
          checkInDate: {
            gte: start,
            lte: end,
          },
          status: { notIn: ["CANCELLED"] }
        },
      }),
      prisma.reservation.count({
        where: {
          propertyId: propId,
          status: "DRAFT", // Or pending, depending on enum
        },
      }),
      prisma.guestProfile.count(),
    ]);

    return {
      success: true,
      data: {
        todayArrivals,
        pendingReservations,
        totalGuests,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getRecentReservations(propertyId?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const propId = propertyId || "resort_1";
    if (!propId) throw new Error("No property found");

    const reservations = await prisma.reservation.findMany({
      where: { propertyId: propId },
      include: {
        guest: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return { success: true, data: reservations };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
