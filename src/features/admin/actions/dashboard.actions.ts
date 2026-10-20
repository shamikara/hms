"use server";

import prisma from "@/core/db/prisma";
import { requireAdminSession, UNAUTHENTICATED, resolveDefaultPropertyId, NO_PROPERTY } from "@/features/admin/lib/requireAdminSession";
import { startOfDay, endOfDay } from "date-fns";

export async function getDashboardMetrics(propertyId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!(await requireAdminSession())) return UNAUTHENTICATED;

  try {
    const today = new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);

    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

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
          status: "DRAFT",
        },
      }),
      prisma.guestProfile.count(),
    ]);

    // Zero is a real answer. `|| 4` turned a quiet day into four arrivals.
    return {
      success: true,
      data: { todayArrivals, pendingReservations, totalGuests },
    };
  } catch (error: any) {
    console.error("getDashboardMetrics failed:", error?.message);
    return { success: false, error: "Could not load today's figures." };
  }
}

export async function getRecentReservations(propertyId?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!(await requireAdminSession())) return UNAUTHENTICATED;

  try {
    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

    const reservations = await prisma.reservation.findMany({
      where: { propertyId: propId },
      include: {
        guest: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // An empty list means no reservations, not "show these instead".
    return { success: true, data: reservations };
  } catch (error: any) {
    console.error("getRecentReservations failed:", error?.message);
    return { success: false, error: "Could not load recent reservations." };
  }
}
