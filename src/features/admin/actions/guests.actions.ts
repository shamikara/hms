"use server";

import prisma from "@/core/db/prisma";
import { requireAdminPermission } from "@/features/admin/lib/requireAdminSession";

export async function getAllGuests(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const guard = await requireAdminPermission("guests:view");
  if (!guard.ok) return guard.failure;

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
