import { Prisma, PaymentStatus } from "@prisma/client";
import prisma from "@/core/db/prisma";
import { toBookingReference } from "@/features/bookings/lib/reference";
import type { Period } from "../lib/period";

const ZERO = new Prisma.Decimal(0);
const MS_PER_NIGHT = 86_400_000;

/* -------------------------------------------------------------- bookings */

export type BookingStatusLabel =
  | "Pending"
  | "Confirmed"
  | "In house"
  | "Departed"
  | "Cancelled"
  | "No-show";

export interface BookingRow {
  reference: string;
  guest: string;
  email: string;
  phone: string | null;
  rooms: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: BookingStatusLabel;
  /** Agreed rate x nights; null when any room had no rate. */
  estimate: number | null;
  createdAt: Date;
}

export interface BookingsReport {
  currencyCode: string;
  rows: BookingRow[];
  totals: {
    bookings: number;
    roomNights: number;
    byStatus: Record<BookingStatusLabel, number>;
    /** Estimated value of bookings that are going ahead (not cancelled / no-show). */
    estimatedValue: number;
    unpricedBookings: number;
  };
}

function statusLabel(reservation: string, stay: string | undefined): BookingStatusLabel {
  if (reservation === "CANCELLED") return "Cancelled";
  if (reservation === "NO_SHOW") return "No-show";
  if (stay === "CHECKED_OUT") return "Departed";
  if (stay === "CHECKED_IN") return "In house";
  return reservation === "CONFIRMED" ? "Confirmed" : "Pending";
}

/** Bookings arriving within the period, earliest arrival first. */
export async function getBookingsReport(propertyId: string, period: Period): Promise<BookingsReport> {
  const [property, reservations] = await Promise.all([
    prisma.property.findUnique({ where: { id: propertyId }, select: { baseCurrency: true } }),
    prisma.reservation.findMany({
      where: { propertyId, checkInDate: { gte: period.start, lt: period.end } },
      orderBy: [{ checkInDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        status: true,
        checkInDate: true,
        checkOutDate: true,
        createdAt: true,
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        stays: {
          select: {
            status: true,
            roomAssignments: {
              select: {
                ratePerNight: true,
                room: { select: { roomNumber: true, roomType: { select: { name: true, basePrice: true } } } },
              },
            },
          },
        },
      },
    }),
  ]);

  const byStatus: Record<BookingStatusLabel, number> = {
    Pending: 0, Confirmed: 0, "In house": 0, Departed: 0, Cancelled: 0, "No-show": 0,
  };
  let roomNights = 0;
  let estimatedValue = 0;
  let unpricedBookings = 0;

  const rows: BookingRow[] = reservations.map((r) => {
    const nights = Math.max(0, Math.round((r.checkOutDate.getTime() - r.checkInDate.getTime()) / MS_PER_NIGHT));
    const assignments = r.stays.flatMap((s) => s.roomAssignments);
    const status = statusLabel(r.status, r.stays[0]?.status);
    byStatus[status] += 1;

    const rates = assignments.map((a) => a.ratePerNight ?? a.room.roomType.basePrice);
    const estimate =
      assignments.length > 0 && rates.every((rate) => rate !== null)
        ? rates.reduce((sum, rate) => sum + Number(rate) * nights, 0)
        : null;

    const goingAhead = status !== "Cancelled" && status !== "No-show";
    if (goingAhead) {
      roomNights += nights * Math.max(1, assignments.length);
      if (estimate === null) unpricedBookings += 1;
      else estimatedValue += estimate;
    }

    return {
      reference: toBookingReference(r.id),
      guest: `${r.guest.firstName} ${r.guest.lastName}`.trim(),
      email: r.guest.email,
      phone: r.guest.phone,
      rooms: assignments.map((a) => `${a.room.roomNumber} ${a.room.roomType.name}`).join(", ") || "-",
      checkIn: r.checkInDate.toISOString().slice(0, 10),
      checkOut: r.checkOutDate.toISOString().slice(0, 10),
      nights,
      status,
      estimate,
      createdAt: r.createdAt,
    };
  });

  return {
    currencyCode: property?.baseCurrency ?? "LKR",
    rows,
    totals: { bookings: rows.length, roomNights, byStatus, estimatedValue, unpricedBookings },
  };
}

/* --------------------------------------------------------------- revenue */

export interface RevenueReport {
  currencyCode: string;
  /** Charges posted to bills within the period. */
  charges: { date: Date; reference: string; guest: string; category: string; description: string; subtotal: number; tax: number; total: number }[];
  /** Payments taken within the period, every status, so refunds and failures show. */
  payments: { date: Date; reference: string; guest: string; method: string; status: string; amount: number }[];
  totals: {
    chargesSubtotal: number;
    chargesTax: number;
    chargesTotal: number;
    byCategory: Record<string, number>;
    received: number;
    byMethod: Record<string, number>;
    refunded: number;
    /** Balance still owed on bills that are open now, whenever they were raised. */
    outstandingNow: number;
  };
}

const CATEGORY: Record<string, string> = {
  ROOM_RATE: "Room",
  F_AND_B: "Food & drink",
  SAFARI: "Safari",
  SPA: "Spa",
  OTHER: "Other",
};
const METHOD: Record<string, string> = { CASH: "Cash", CREDIT_CARD: "Card", BANK_TRANSFER: "Bank transfer" };

export async function getRevenueReport(propertyId: string, period: Period): Promise<RevenueReport> {
  const byProperty = { invoice: { reservation: { propertyId } } };
  const guestSelect = {
    invoice: {
      select: {
        reservationId: true,
        reservation: { select: { guest: { select: { firstName: true, lastName: true } } } },
      },
    },
  } as const;

  const [property, lines, payments, openInvoices] = await Promise.all([
    prisma.property.findUnique({ where: { id: propertyId }, select: { baseCurrency: true } }),
    prisma.lineItem.findMany({
      where: { ...byProperty, createdAt: { gte: period.start, lt: period.end } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, category: true, description: true, subtotal: true, tax: true, total: true, ...guestSelect },
    }),
    prisma.payment.findMany({
      where: { ...byProperty, createdAt: { gte: period.start, lt: period.end } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true, amount: true, method: true, status: true, ...guestSelect },
    }),
    prisma.invoice.findMany({
      where: { status: "OPEN", reservation: { propertyId } },
      select: { lineItems: { select: { total: true } }, payments: { select: { amount: true, status: true } } },
    }),
  ]);

  const who = (inv: { reservationId: string | null; reservation: { guest: { firstName: string; lastName: string } } | null }) => ({
    reference: inv.reservationId ? toBookingReference(inv.reservationId) : "-",
    guest: inv.reservation ? `${inv.reservation.guest.firstName} ${inv.reservation.guest.lastName}`.trim() : "-",
  });

  const byCategory: Record<string, number> = {};
  const charges = lines.map((l) => {
    const category = CATEGORY[l.category] ?? l.category;
    byCategory[category] = (byCategory[category] ?? 0) + Number(l.total);
    return {
      date: l.createdAt,
      ...who(l.invoice),
      category,
      description: l.description,
      subtotal: Number(l.subtotal),
      tax: Number(l.tax),
      total: Number(l.total),
    };
  });

  const byMethod: Record<string, number> = {};
  let received = 0;
  let refunded = 0;
  const paymentRows = payments.map((p) => {
    const method = METHOD[p.method] ?? p.method;
    const amount = Number(p.amount);
    if (p.status === PaymentStatus.CLEARED) {
      received += amount;
      byMethod[method] = (byMethod[method] ?? 0) + amount;
    }
    if (p.status === PaymentStatus.REFUNDED) refunded += amount;
    return { date: p.createdAt, ...who(p.invoice), method, status: p.status.charAt(0) + p.status.slice(1).toLowerCase(), amount };
  });

  const outstandingNow = openInvoices.reduce((acc, inv) => {
    const total = inv.lineItems.reduce((s, l) => s.plus(l.total), ZERO);
    const paid = inv.payments.filter((p) => p.status === PaymentStatus.CLEARED).reduce((s, p) => s.plus(p.amount), ZERO);
    return acc.plus(total.minus(paid));
  }, ZERO);

  return {
    currencyCode: property?.baseCurrency ?? "LKR",
    charges,
    payments: paymentRows,
    totals: {
      chargesSubtotal: charges.reduce((s, c) => s + c.subtotal, 0),
      chargesTax: charges.reduce((s, c) => s + c.tax, 0),
      chargesTotal: charges.reduce((s, c) => s + c.total, 0),
      byCategory,
      received,
      byMethod,
      refunded,
      outstandingNow: Number(outstandingNow),
    },
  };
}
