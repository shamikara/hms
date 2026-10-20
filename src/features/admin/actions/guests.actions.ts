"use server";

import prisma from "@/core/db/prisma";
import { requireAdminSession, UNAUTHENTICATED } from "@/features/admin/lib/requireAdminSession";

export async function getAllGuests(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  if (!(await requireAdminSession())) return UNAUTHENTICATED;

  try {
    const guests = await prisma.guestProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reservations: true,
      }
    });

    return { success: true, data: guests };
  } catch (error: any) {
    console.error("getAllGuests failed:", error?.message);
    return { success: false, error: "Could not load the guest list." };
  }
}
