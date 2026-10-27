import { Prisma, LineItemCategory, PaymentMethod, PaymentStatus } from "@prisma/client";
import prisma from "@/core/db/prisma";

/**
 * The guest's bill for one reservation.
 *
 * The Invoice / LineItem / Payment models have existed since the first schema
 * and nothing has ever written to them, so check-out closed a stay without
 * producing a bill. This is the layer that fills them in.
 *
 * Money is Decimal end to end. Every amount read out of the database stays a
 * Decimal until the moment it is formatted for the screen; doing arithmetic on
 * Number first is how a folio ends up a cent out and nobody can say why.
 */

/** Raised for a problem the desk can act on, as opposed to a fault. */
export class FolioError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FolioError";
  }
}

const ZERO = new Prisma.Decimal(0);
const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

/** Property-level setting holding the tax percentage applied to charges. */
export const TAX_SETTING_KEY = "billing.taxPercent";

export interface FolioLine {
  id: string;
  category: LineItemCategory;
  description: string;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: Date;
}

export interface FolioPayment {
  id: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  createdAt: Date;
}

export interface Folio {
  invoiceId: string | null;
  status: "OPEN" | "CLOSED" | "VOIDED" | null;
  currencyCode: string;
  lines: FolioLine[];
  payments: FolioPayment[];
  subtotal: string;
  tax: string;
  total: string;
  paid: string;
  balance: string;
  /**
   * False when no tax rate has been set for the property. The screen says so
   * rather than showing a confident zero, because "no tax here" and "nobody
   * has configured this yet" are different facts and only one is safe.
   */
  taxConfigured: boolean;
  /** True once room charges have been posted, so they are not posted twice. */
  roomChargesPosted: boolean;
}

type Db = Prisma.TransactionClient | typeof prisma;

/** The tax rate for a property, or null when none has been set. */
export async function getTaxPercent(propertyId: string, db: Db = prisma): Promise<Prisma.Decimal | null> {
  const setting = await db.setting.findFirst({
    where: { propertyId, key: TAX_SETTING_KEY },
    select: { value: true },
  });
  if (!setting) return null;

  // Stored as a JSON number or numeric string; anything else is a bad row and
  // must not silently become zero tax on a real invoice.
  const raw = setting.value;
  const parsed =
    typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return new Prisma.Decimal(parsed);
}

/** Splits a gross-exclusive amount into subtotal / tax / total. */
function applyTax(subtotal: Prisma.Decimal, taxPercent: Prisma.Decimal | null) {
  const tax = taxPercent
    ? subtotal.times(taxPercent).dividedBy(100).toDecimalPlaces(4)
    : ZERO;
  return { subtotal, tax, total: subtotal.plus(tax) };
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_NIGHT));
}

/**
 * The reservation's invoice, created on first use.
 *
 * One invoice per reservation. The schema allows an invoice to hang off either
 * a reservation or a stay; attaching to the reservation keeps the whole visit
 * on one bill even if the stay is split across rooms.
 */
export async function getOrCreateInvoice(reservationId: string, db: Db = prisma) {
  const existing = await db.invoice.findFirst({
    where: { reservationId, status: { not: "VOIDED" } },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return db.invoice.create({ data: { reservationId, status: "OPEN" } });
}

/**
 * Posts the room charge for each room on the booking.
 *
 * Idempotent: if ROOM_RATE lines already exist on the invoice it does nothing,
 * so a second check-out attempt cannot bill the guest twice.
 *
 * Refuses rather than guesses when a room type has no rate. A bill with an
 * invented number on it is worse than no bill.
 */
export async function postRoomCharges(reservationId: string, db: Db = prisma) {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: {
      checkInDate: true,
      checkOutDate: true,
      property: { select: { id: true, baseCurrency: true } },
      stays: {
        select: {
          roomAssignments: {
            where: { releasedAt: null },
            select: {
              ratePerNight: true,
              room: {
                select: { roomNumber: true, roomType: { select: { name: true, basePrice: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!reservation) throw new FolioError("That reservation no longer exists.");

  const invoice = await getOrCreateInvoice(reservationId, db);

  const alreadyPosted = await db.lineItem.count({
    where: { invoiceId: invoice.id, category: LineItemCategory.ROOM_RATE },
  });
  if (alreadyPosted > 0) return invoice;

  const assignments = reservation.stays.flatMap((stay) => stay.roomAssignments);
  if (assignments.length === 0) {
    throw new FolioError("No room is assigned to this booking, so there is nothing to charge for.");
  }

  // The rate agreed at booking wins. Falling back to the room type's current
  // rate only covers assignments made before rates were captured, and is the
  // only figure on record for those.
  const rateFor = (assignment: (typeof assignments)[number]) =>
    assignment.ratePerNight ?? assignment.room.roomType.basePrice;

  const unpriced = assignments.filter((a) => rateFor(a) === null);
  if (unpriced.length > 0) {
    const names = [...new Set(unpriced.map((a) => a.room.roomType.name))].join(", ");
    throw new FolioError(
      `No nightly rate is set for ${names}. Set it under Room Inventory before billing this stay.`,
    );
  }

  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const taxPercent = await getTaxPercent(reservation.property.id, db);

  await db.lineItem.createMany({
    data: assignments.map((assignment) => {
      const rate = new Prisma.Decimal(rateFor(assignment)!);
      const { subtotal, tax, total } = applyTax(rate.times(nights), taxPercent);
      return {
        invoiceId: invoice.id,
        category: LineItemCategory.ROOM_RATE,
        description: `${assignment.room.roomType.name} · Room ${assignment.room.roomNumber} · ${nights} night${nights === 1 ? "" : "s"}`,
        subtotal,
        tax,
        discount: ZERO,
        total,
        currencyCode: reservation.property.baseCurrency,
      };
    }),
  });

  return invoice;
}

/** Posts an extra charge — a meal, a drive, a laundry bill. */
export async function addCharge(
  reservationId: string,
  input: { category: LineItemCategory; description: string; amount: number },
  db: Db = prisma,
) {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: { property: { select: { id: true, baseCurrency: true } } },
  });
  if (!reservation) throw new FolioError("That reservation no longer exists.");

  const invoice = await getOrCreateInvoice(reservationId, db);
  if (invoice.status === "CLOSED") {
    throw new FolioError("This folio is closed. Reopen it before adding charges.");
  }

  const taxPercent = await getTaxPercent(reservation.property.id, db);
  const { subtotal, tax, total } = applyTax(new Prisma.Decimal(input.amount), taxPercent);

  await db.lineItem.create({
    data: {
      invoiceId: invoice.id,
      category: input.category,
      description: input.description,
      subtotal,
      tax,
      discount: ZERO,
      total,
      currencyCode: reservation.property.baseCurrency,
    },
  });

  return invoice;
}

/** Records money taken from the guest. */
export async function recordPayment(
  reservationId: string,
  input: { amount: number; method: PaymentMethod; reference?: string },
  db: Db = prisma,
) {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: { property: { select: { baseCurrency: true } } },
  });
  if (!reservation) throw new FolioError("That reservation no longer exists.");

  const invoice = await getOrCreateInvoice(reservationId, db);

  await db.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: new Prisma.Decimal(input.amount),
      currencyCode: reservation.property.baseCurrency,
      method: input.method,
      // Recorded by hand at the desk, so it is money already in the till.
      // A card gateway would post PENDING and settle it on the callback.
      status: PaymentStatus.CLEARED,
      gatewayRef: input.reference ?? null,
    },
  });

  return invoice;
}

/** Reads the whole bill, with totals. */
export async function getFolio(reservationId: string, db: Db = prisma): Promise<Folio> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: { property: { select: { id: true, baseCurrency: true } } },
  });
  if (!reservation) throw new FolioError("That reservation no longer exists.");

  const invoice = await db.invoice.findFirst({
    where: { reservationId, status: { not: "VOIDED" } },
    orderBy: { createdAt: "asc" },
    include: {
      lineItems: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" } },
    },
  });

  const taxPercent = await getTaxPercent(reservation.property.id, db);
  const currencyCode = reservation.property.baseCurrency;

  if (!invoice) {
    return {
      invoiceId: null,
      status: null,
      currencyCode,
      lines: [],
      payments: [],
      subtotal: "0",
      tax: "0",
      total: "0",
      paid: "0",
      balance: "0",
      taxConfigured: taxPercent !== null,
      roomChargesPosted: false,
    };
  }

  const subtotal = invoice.lineItems.reduce((sum, l) => sum.plus(l.subtotal), ZERO);
  const tax = invoice.lineItems.reduce((sum, l) => sum.plus(l.tax), ZERO);
  const total = invoice.lineItems.reduce((sum, l) => sum.plus(l.total), ZERO);
  const paid = invoice.payments
    .filter((p) => p.status === PaymentStatus.CLEARED)
    .reduce((sum, p) => sum.plus(p.amount), ZERO);

  return {
    invoiceId: invoice.id,
    status: invoice.status,
    currencyCode,
    lines: invoice.lineItems.map((l) => ({
      id: l.id,
      category: l.category,
      description: l.description,
      subtotal: l.subtotal.toFixed(2),
      tax: l.tax.toFixed(2),
      total: l.total.toFixed(2),
      createdAt: l.createdAt,
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toFixed(2),
      method: p.method,
      status: p.status,
      createdAt: p.createdAt,
    })),
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
    paid: paid.toFixed(2),
    balance: total.minus(paid).toFixed(2),
    taxConfigured: taxPercent !== null,
    roomChargesPosted: invoice.lineItems.some((l) => l.category === LineItemCategory.ROOM_RATE),
  };
}

/** Closes a settled folio. Refuses while money is still owed. */
export async function closeFolio(reservationId: string, db: Db = prisma) {
  const folio = await getFolio(reservationId, db);
  if (!folio.invoiceId) throw new FolioError("There is nothing on this folio yet.");
  if (folio.status === "CLOSED") return;

  if (new Prisma.Decimal(folio.balance).greaterThan(0)) {
    throw new FolioError(
      `There is still ${folio.balance} ${folio.currencyCode} outstanding. Take payment before closing the folio.`,
    );
  }

  await db.invoice.update({ where: { id: folio.invoiceId }, data: { status: "CLOSED" } });
}
