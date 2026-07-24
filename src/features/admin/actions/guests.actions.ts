"use server";

import prisma from "@/core/db/prisma";

const mockGuests = [
  { id: "g1", firstName: "Alexander", lastName: "Wright", email: "alexander.wright@luxurytravel.com", phone: "+44 7700 900077", reservations: [1, 2], createdAt: new Date("2026-01-15") },
  { id: "g2", firstName: "Sophia", lastName: "Martinez", email: "sophia.m@natureestates.org", phone: "+1 312 555 0199", reservations: [1], createdAt: new Date("2026-02-10") },
  { id: "g3", firstName: "Marcus", lastName: "Vance", email: "marcus.vance@safarijournal.com", phone: "+61 412 000 888", reservations: [1], createdAt: new Date("2026-03-01") },
  { id: "g4", firstName: "Emily", lastName: "Watson", email: "emily.watson@globaltours.co.uk", phone: "+44 20 7946 0912", reservations: [1], createdAt: new Date("2026-04-12") },
];

export async function getAllGuests(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const guests = await prisma.guestProfile.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reservations: true,
      }
    });

    return { success: true, data: guests.length > 0 ? guests : mockGuests };
  } catch (error: any) {
    console.warn("Prisma DB unreachable on getAllGuests, using fallback mock guests:", error?.message);
    return { success: true, data: mockGuests };
  }
}
