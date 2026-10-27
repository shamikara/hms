"use server";

import { Prisma, PaymentStatus } from "@prisma/client";
import prisma from "@/core/db/prisma";
import {
  requireAdminPermission,
  resolveDefaultPropertyId,
  NO_PROPERTY,
} from "@/features/admin/lib/requireAdminSession";
import { toBookingReference } from "@/features/bookings/lib/reference";

/**
 * Figures for the revenue screen.
 *
 * Every number here is summed from LineItem and Payment rows. The screen this
 * replaced fell back to four invented invoices whenever the database was empty
 * or unreachable, and printed "+14.2% vs previous period" underneath either
 * way — a figure nothing computed.
 */

const ZERO = new Prisma.Decimal(0);

export interface FinanceInvoice {
  id: string;
  reservationId: string | null;
  reference: string | null;
  guestName: string;
  status: "OPEN" | "CLOSED" | "VOIDED";
  total: string;
  paid: string;
  balance: string;
  createdAt: Date;
}

export interface FinanceSummary {
  currencyCode: string;
  /** Cleared payments received since the first of this month. */
  receivedThisMonth: string;
  /** Cleared payments in the same span of the previous month, for comparison. */
  receivedLastMonth: string;
  openInvoiceCount: number;
  /** Charges raised but not yet paid, across every open folio. */
  outstanding: string;
  invoices: FinanceInvoice[];
}

export async function getFinanceSummary(
  propertyId?: string,
): Promise<{ success: boolean; data?: FinanceSummary; error?: string }> {
  const guard = await requireAdminPermission("finance:view");
  if (!guard.ok) return guard.failure;

  try {
    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

    const property = await prisma.property.findUnique({
      where: { id: propId },
      select: { baseCurrency: true },
    });

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const byProperty = { invoice: { reservation: { propertyId: propId } } };

    const [thisMonth, lastMonth, invoices] = await Promise.all([
      prisma.payment.findMany({
        where: { ...byProperty, status: PaymentStatus.CLEARED, createdAt: { gte: monthStart } },
        select: { amount: true },
      }),
      prisma.payment.findMany({
        where: {
          ...byProperty,
          status: PaymentStatus.CLEARED,
          createdAt: { gte: previousMonthStart, lt: monthStart },
        },
        select: { amount: true },
      }),
      prisma.invoice.findMany({
        where: { reservation: { propertyId: propId } },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          status: true,
          createdAt: true,
          reservationId: true,
          lineItems: { select: { total: true } },
          payments: { select: { amount: true, status: true } },
          reservation: { select: { guest: { select: { firstName: true, lastName: true } } } },
        },
      }),
    ]);

    const sum = (rows: { amount: Prisma.Decimal }[]) =>
      rows.reduce((acc, row) => acc.plus(row.amount), ZERO);

    const mapped: FinanceInvoice[] = invoices.map((invoice) => {
      const total = invoice.lineItems.reduce((acc, l) => acc.plus(l.total), ZERO);
      const paid = invoice.payments
        .filter((p) => p.status === PaymentStatus.CLEARED)
        .reduce((acc, p) => acc.plus(p.amount), ZERO);

      return {
        id: invoice.id,
        reservationId: invoice.reservationId,
        reference: invoice.reservationId ? toBookingReference(invoice.reservationId) : null,
        guestName: invoice.reservation
          ? `${invoice.reservation.guest.firstName} ${invoice.reservation.guest.lastName}`.trim()
          : "—",
        status: invoice.status,
        total: total.toFixed(2),
        paid: paid.toFixed(2),
        balance: total.minus(paid).toFixed(2),
        createdAt: invoice.createdAt,
      };
    });

    const outstanding = mapped
      .filter((i) => i.status === "OPEN")
      .reduce((acc, i) => acc.plus(new Prisma.Decimal(i.balance)), ZERO);

    return {
      success: true,
      data: {
        currencyCode: property?.baseCurrency ?? "USD",
        receivedThisMonth: sum(thisMonth).toFixed(2),
        receivedLastMonth: sum(lastMonth).toFixed(2),
        openInvoiceCount: mapped.filter((i) => i.status === "OPEN").length,
        outstanding: outstanding.toFixed(2),
        invoices: mapped,
      },
    };
  } catch (error) {
    console.error("getFinanceSummary failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Could not load the revenue figures." };
  }
}

export interface InHouseGuest {
  reservationId: string;
  guestName: string;
  roomNumbers: string[];
  reference: string;
}

/**
 * Guests currently in the building, for charging food and drink to a room.
 *
 * Only CHECKED_IN stays: you cannot put a bar tab on someone who has not
 * arrived, and once they have left the folio should be settled rather than
 * added to.
 */
export async function getInHouseGuests(
  propertyId?: string,
): Promise<{ success: boolean; data?: InHouseGuest[]; error?: string }> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;

  try {
    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

    const stays = await prisma.stay.findMany({
      where: {
        status: "CHECKED_IN",
        reservation: { propertyId: propId, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      },
      select: {
        reservation: {
          select: { id: true, guest: { select: { firstName: true, lastName: true } } },
        },
        roomAssignments: {
          where: { releasedAt: null },
          select: { room: { select: { roomNumber: true } } },
        },
      },
      orderBy: { actualArrival: "desc" },
    });

    return {
      success: true,
      data: stays.map((stay) => ({
        reservationId: stay.reservation.id,
        reference: toBookingReference(stay.reservation.id),
        guestName: `${stay.reservation.guest.firstName} ${stay.reservation.guest.lastName}`.trim(),
        roomNumbers: stay.roomAssignments.map((a) => a.room.roomNumber),
      })),
    };
  } catch (error) {
    console.error("getInHouseGuests failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Could not load the in-house list." };
  }
}
