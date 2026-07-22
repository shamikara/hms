"use server";

import prisma from "@/core/db/prisma";
import { GuestProfile } from "@prisma/client";

export async function getAllGuests(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const guests = await prisma.guestProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reservations: true,
      }
    });

    return { success: true, data: guests };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
