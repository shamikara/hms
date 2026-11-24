"use server";

import prisma from "@/core/db/prisma";
import { getAdminActor, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { toBookingReference } from "@/features/bookings/lib/reference";

export interface StaffAlert {
  id: string;
  kind: "booking" | "enquiry";
  title: string;
  description: string;
  href: string;
  createdAt: string;
}

type Result = { success: boolean; data?: { alerts: StaffAlert[]; bookings: number; enquiries: number }; error?: string };

const DAY = 86_400_000;
const shortDate = (d: Date) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);

/**
 * What is waiting for the front desk right now: website booking requests not
 * yet confirmed or cancelled, and contact-form messages not yet answered.
 * These clear themselves once staff act, so there is no separate "read" state.
 * Each list is only included for staff who may see it.
 */
export async function loadStaffAlertsAction(): Promise<Result> {
  const actor = await getAdminActor();
  if (!actor || !actor.permissions.includes("admin:access")) return { success: false, error: "Not signed in." };
  const canBookings = actor.permissions.includes("reservations:view");
  const canEnquiries = actor.permissions.includes("enquiries:view");

  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: true, data: { alerts: [], bookings: 0, enquiries: 0 } };

    const since = new Date(Date.now() - 60 * DAY);
    const [requests, enquiries] = await Promise.all([
      canBookings
        ? prisma.reservation.findMany({
            where: {
              propertyId,
              status: "DRAFT",
              createdAt: { gte: since },
              // A guest still on the payment page has not finished booking yet.
              onlinePayments: { none: { status: "PENDING" } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
              id: true,
              createdAt: true,
              checkInDate: true,
              checkOutDate: true,
              guest: { select: { firstName: true, lastName: true } },
            },
          })
        : [],
      canEnquiries
        ? prisma.enquiry.findMany({
            where: { propertyId, status: "NEW", createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, createdAt: true, name: true, subject: true },
          })
        : [],
    ]);

    const alerts: StaffAlert[] = [
      ...requests.map((r) => ({
        id: `booking:${r.id}`,
        kind: "booking" as const,
        title: `New booking request · ${toBookingReference(r.id)}`,
        description: `${`${r.guest.firstName} ${r.guest.lastName}`.trim()} · ${shortDate(r.checkInDate)} → ${shortDate(r.checkOutDate)}`,
        href: "/admin/bookings",
        createdAt: r.createdAt.toISOString(),
      })),
      ...enquiries.map((e) => ({
        id: `enquiry:${e.id}`,
        kind: "enquiry" as const,
        title: `New message from ${e.name}`,
        description: e.subject,
        href: "/admin/enquiries",
        createdAt: e.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { success: true, data: { alerts, bookings: requests.length, enquiries: enquiries.length } };
  } catch (error) {
    console.error("loadStaffAlertsAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Could not load alerts." };
  }
}
