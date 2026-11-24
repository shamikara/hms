import { createHmac, timingSafeEqual } from "node:crypto";
import { OnlinePaymentStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";
import { SITE_URL } from "@/lib/seo/site";
import { applyTax, getOrCreateInvoice, getTaxPercent, nightsBetween } from "@/features/billing/services/folio.service";
import { isRoomOverlapError } from "@/features/bookings/services/booking.service";
import { toBookingReference } from "@/features/bookings/lib/reference";
import { gatewayMode, PaymentsLk, PaymentsLkError, type PlkCheckout, type PlkPayment, type PlkRefund } from "../lib/payments-lk";
import { freeCancelDeadline } from "./payment-settings.service";
import type { PayChoice } from "../validations/payment.schema";

type Db = Prisma.TransactionClient | typeof prisma;

/** How long a guest has to pay before the held room is let go. */
export const CHECKOUT_MINUTES = 30;
/** The gateway's smallest charge, Rs. 10.00. */
const MIN_CENTS = 1000;
/** Payment statuses on the gateway that mean the money was taken. */
const PAID_STATUSES = new Set(["succeeded", "partially_refunded", "refunded"]);

export class OnlinePaymentError extends Error {}

/* ------------------------------------------------------------- money */

/**
 * The stay's total in cents, from the rates locked in on the booking plus tax.
 * Null when any room on it has no rate (then it cannot be paid online).
 */
export async function quoteReservationCents(reservationId: string, db: Db = prisma): Promise<number | null> {
  const reservation = await db.reservation.findUnique({
    where: { id: reservationId },
    select: {
      propertyId: true,
      checkInDate: true,
      checkOutDate: true,
      stays: {
        select: {
          roomAssignments: {
            where: { releasedAt: null },
            select: { ratePerNight: true, room: { select: { roomType: { select: { basePrice: true } } } } },
          },
        },
      },
    },
  });
  if (!reservation) return null;
  const assignments = reservation.stays.flatMap((s) => s.roomAssignments);
  if (assignments.length === 0) return null;
  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const taxPercent = await getTaxPercent(reservation.propertyId, db);

  let total = new Prisma.Decimal(0);
  for (const a of assignments) {
    const rate = a.ratePerNight ?? a.room.roomType.basePrice;
    if (rate === null) return null;
    total = total.plus(applyTax(new Prisma.Decimal(rate).times(nights), taxPercent).total);
  }
  return Math.round(total.times(100).toNumber());
}

/** What to charge now: the whole stay, or the advance rounded up to whole rupees. */
export function chargeFor(totalCents: number, choice: PayChoice, advancePercent: number): number {
  if (choice === "FULL" || advancePercent >= 100) return totalCents;
  const advance = Math.ceil((totalCents * advancePercent) / 100 / 100) * 100;
  return Math.min(totalCents, Math.max(MIN_CENTS, advance));
}

/* -------------------------------------------------------------- links */

/**
 * The return and cancel links carry the payment attempt's id and a signature
 * over it, so nobody can act on someone else's booking by changing the id.
 */
export function signAttempt(id: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return createHmac("sha256", secret).update(`online-payment:${id}`).digest("hex").slice(0, 40);
}

export function verifyAttempt(id: string | undefined, token: string | undefined): id is string {
  if (!id || !token || id.length > 64 || !/^[0-9a-f]{40}$/.test(token)) return false;
  const expected = Buffer.from(signAttempt(id));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function attemptQuery(id: string) {
  return `op=${encodeURIComponent(id)}&t=${signAttempt(id)}`;
}

/* -------------------------------------------------------- reservation */

/** Lets the held room go. Only ever touches a booking that is still a draft. */
async function releaseDraft(reservationId: string, db: Db) {
  const updated = await db.reservation.updateMany({
    where: { id: reservationId, status: "DRAFT" },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 1) {
    await db.roomAssignment.updateMany({
      where: { stay: { reservationId }, releasedAt: null },
      data: { releasedAt: new Date() },
    });
  }
  return updated.count === 1;
}

/* ----------------------------------------------------------- checkout */

export interface StartCheckoutInput {
  reservationId: string;
  propertyId: string;
  checkInDate: Date;
  choice: PayChoice;
  advancePercent: number;
  freeCancelDays: number;
  currency: string;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
}

/**
 * Opens a hosted checkout for a held draft booking and returns where to send
 * the guest. If the gateway refuses, the hold is released so the room does not
 * sit blocked by a booking nobody can pay for.
 */
export async function startCheckout(input: StartCheckoutInput): Promise<{ url: string; amountCents: number; onlinePaymentId: string }> {
  const totalCents = await quoteReservationCents(input.reservationId);
  if (totalCents === null || totalCents < MIN_CENTS) {
    await releaseDraft(input.reservationId, prisma);
    throw new OnlinePaymentError("One of these rooms has no online rate yet, so it can't be paid for online. Please send it as a request instead.");
  }
  const amountCents = chargeFor(totalCents, input.choice, input.advancePercent);
  const reference = toBookingReference(input.reservationId);

  const attempt = await prisma.onlinePayment.create({
    data: {
      propertyId: input.propertyId,
      reservationId: input.reservationId,
      mode: gatewayMode() ?? "test",
      kind: amountCents >= totalCents ? "FULL" : "ADVANCE",
      amountCents,
      currency: input.currency,
      expiresAt: new Date(Date.now() + CHECKOUT_MINUTES * 60_000),
      freeCancelUntil: freeCancelDeadline(input.checkInDate, input.freeCancelDays),
    },
  });

  try {
    const checkout = await PaymentsLk.createCheckout(
      {
        amountCents,
        currency: input.currency,
        description: `Lily Safari Resort · booking ${reference} · ${amountCents >= totalCents ? "full payment" : "advance"}`,
        reference: attempt.id,
        customer: {
          name: `${input.guest.firstName} ${input.guest.lastName}`.trim().slice(0, 100),
          email: input.guest.email,
          ...(input.guest.phone ? { phone: input.guest.phone } : {}),
        },
        successUrl: `${SITE_URL}/book/payment/return?${attemptQuery(attempt.id)}`,
        cancelUrl: `${SITE_URL}/book/payment/cancelled?${attemptQuery(attempt.id)}`,
        expiresInMinutes: CHECKOUT_MINUTES,
      },
      `checkout:${attempt.id}`,
    );
    if (!checkout?.id || !checkout.url || !/^https:\/\//.test(checkout.url) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(checkout.url)) {
      throw new PaymentsLkError("Payments.lk did not return a checkout page.", null, "bad_response");
    }
    await prisma.onlinePayment.update({
      where: { id: attempt.id },
      data: {
        checkoutId: checkout.id,
        checkoutUrl: checkout.url,
        ...(checkout.expiresAt ? { expiresAt: new Date(checkout.expiresAt) } : {}),
      },
    });
    return { url: checkout.url, amountCents, onlinePaymentId: attempt.id };
  } catch (error) {
    console.error("startCheckout failed:", error instanceof Error ? error.message : error);
    await prisma.$transaction(async (tx) => {
      await tx.onlinePayment.update({ where: { id: attempt.id }, data: { status: "FAILED" } });
      await releaseDraft(input.reservationId, tx);
    });
    throw new OnlinePaymentError("Online payment isn't available right now. Please try again in a moment, or send your booking as a request and pay at the resort.");
  }
}

/* -------------------------------------------------------------- settle */

export type SettleOutcome =
  | { state: "paid"; firstTime: boolean; attentionNote: string | null }
  | { state: "pending" }
  | { state: "expired" }
  | { state: "failed"; message: string | null }
  | { state: "abandoned" }
  | { state: "unknown" };

function paymentFromCheckout(checkout: PlkCheckout | null): PlkPayment | null {
  return checkout?.payment && typeof checkout.payment === "object" ? checkout.payment : null;
}

/**
 * Brings a payment attempt in line with what the gateway says, and acts on it.
 *
 * The only place money is ever marked as received. It never trusts a browser
 * redirect or a webhook body on its own: it reads the checkout back from
 * Payments.lk with the secret key and checks the amount, currency and
 * reference match before confirming anything. Safe to call any number of
 * times, from the webhook, the return page and the sweep at once.
 */
export async function settleAttempt(onlinePaymentId: string): Promise<SettleOutcome> {
  const attempt = await prisma.onlinePayment.findUnique({ where: { id: onlinePaymentId } });
  if (!attempt) return { state: "unknown" };
  if (attempt.status === "SUCCEEDED") return { state: "paid", firstTime: false, attentionNote: attempt.attentionNote };
  if (!attempt.checkoutId) return attempt.status === "FAILED" ? { state: "failed", message: null } : { state: "unknown" };

  const checkout = await PaymentsLk.getCheckout(attempt.checkoutId);
  const payment = paymentFromCheckout(checkout);

  if (payment && PAID_STATUSES.has(payment.status)) {
    const matches =
      payment.amountCents === attempt.amountCents &&
      (payment.currency ?? attempt.currency).toUpperCase() === attempt.currency.toUpperCase() &&
      (payment.reference == null || payment.reference === attempt.id);
    if (!matches) {
      // Paid, but not what we asked for. Record nothing automatically.
      const note = `Payments.lk reports a payment (${payment.id}) of ${payment.amountCents / 100} ${payment.currency ?? ""} that does not match this attempt. Check it in the Payments.lk dashboard.`;
      await prisma.onlinePayment.update({ where: { id: attempt.id }, data: { attentionNote: note } });
      console.error("settleAttempt mismatch:", attempt.id, payment.id);
      return { state: "unknown" };
    }
    return markPaid(attempt.id, payment);
  }

  if (checkout.status === "expired" || (attempt.status === "PENDING" && attempt.expiresAt.getTime() < Date.now() - 5 * 60_000 && checkout.status !== "open")) {
    return expireAttempt(attempt.id);
  }
  if (payment && payment.status === "failed" && checkout.status !== "open") {
    return { state: "failed", message: payment.failureMessage ?? null };
  }
  if (attempt.status === "ABANDONED") return { state: "abandoned" };
  if (attempt.status === "EXPIRED") return { state: "expired" };
  return { state: "pending" };
}

async function markPaid(onlinePaymentId: string, payment: PlkPayment): Promise<SettleOutcome> {
  const result = await prisma.$transaction(async (tx) => {
    // The status guard makes this a once-only step even with three callers racing.
    const claimed = await tx.onlinePayment.updateMany({
      where: { id: onlinePaymentId, status: { not: OnlinePaymentStatus.SUCCEEDED } },
      data: {
        status: OnlinePaymentStatus.SUCCEEDED,
        paymentId: payment.id,
        paidAt: new Date(),
        cardBrand: payment.card?.scheme ?? null,
        cardLast4: payment.card?.last4 ?? null,
      },
    });
    const attempt = await tx.onlinePayment.findUniqueOrThrow({ where: { id: onlinePaymentId } });
    if (claimed.count === 0) return { firstTime: false, note: attempt.attentionNote };

    const invoice = await getOrCreateInvoice(attempt.reservationId, tx);
    const folioPayment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: new Prisma.Decimal(attempt.amountCents).dividedBy(100),
        currencyCode: attempt.currency,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.CLEARED,
        gatewayRef: `payments.lk ${payment.id}`,
      },
    });

    // Confirm the booking. If the hold had already lapsed and been released,
    // try to take the room back; if someone else has it, a person must sort it.
    const reservation = await tx.reservation.findUniqueOrThrow({
      where: { id: attempt.reservationId },
      select: { status: true },
    });
    let note: string | null = null;
    if (reservation.status === "DRAFT") {
      await tx.reservation.update({ where: { id: attempt.reservationId }, data: { status: "CONFIRMED" } });
    } else if (reservation.status === "CANCELLED") {
      note = "Paid after the booking was cancelled (the payment window had run out). Re-confirm the booking or refund the guest.";
    }
    if (note) await tx.onlinePayment.update({ where: { id: attempt.id }, data: { attentionNote: note } });
    await tx.onlinePayment.update({ where: { id: attempt.id }, data: { folioPaymentId: folioPayment.id } });
    return { firstTime: true, note };
  });

  // Outside the transaction: try to reinstate a released booking. The overlap
  // constraint refuses if the room went to someone else, which is fine.
  if (result.firstTime && result.note) {
    const attempt = await prisma.onlinePayment.findUniqueOrThrow({ where: { id: onlinePaymentId } });
    try {
      await prisma.$transaction(async (tx) => {
        await tx.reservation.update({ where: { id: attempt.reservationId }, data: { status: "CONFIRMED" } });
        await tx.roomAssignment.updateMany({
          where: { stay: { reservationId: attempt.reservationId }, NOT: { releasedAt: null } },
          data: { releasedAt: null },
        });
      });
      const ok = "Paid just after the payment window ran out. The room was still free, so the booking was re-confirmed automatically.";
      await prisma.onlinePayment.update({ where: { id: onlinePaymentId }, data: { attentionNote: ok } });
      result.note = ok;
    } catch (error) {
      if (!isRoomOverlapError(error)) console.error("reinstate after late payment failed:", error);
      const bad = "Paid after the payment window ran out, and the room has since gone to another booking. Find the guest another room or refund them.";
      await prisma.onlinePayment.update({ where: { id: onlinePaymentId }, data: { attentionNote: bad } });
      result.note = bad;
    }
  }

  return { state: "paid", firstTime: result.firstTime, attentionNote: result.note };
}

async function expireAttempt(onlinePaymentId: string): Promise<SettleOutcome> {
  const released = await prisma.$transaction(async (tx) => {
    const claimed = await tx.onlinePayment.updateMany({
      where: { id: onlinePaymentId, status: OnlinePaymentStatus.PENDING },
      data: { status: OnlinePaymentStatus.EXPIRED },
    });
    if (claimed.count === 0) return false;
    const attempt = await tx.onlinePayment.findUniqueOrThrow({ where: { id: onlinePaymentId } });
    // Only let the room go if nothing on this booking has been paid.
    const paid = await tx.onlinePayment.count({
      where: { reservationId: attempt.reservationId, status: OnlinePaymentStatus.SUCCEEDED },
    });
    if (paid === 0) await releaseDraft(attempt.reservationId, tx);
    return true;
  });
  const attempt = await prisma.onlinePayment.findUnique({ where: { id: onlinePaymentId }, select: { status: true } });
  if (attempt?.status === "ABANDONED") return { state: "abandoned" };
  void released;
  return { state: "expired" };
}

/* ------------------------------------------------- guest decisions */

/**
 * The guest backed out of the card page and chose to keep the booking as a
 * pay-at-the-resort request. The hold stays; staff confirm it by hand.
 */
export async function keepAsRequest(onlinePaymentId: string): Promise<boolean> {
  const outcome = await settleAttempt(onlinePaymentId).catch(() => ({ state: "unknown" }) as SettleOutcome);
  if (outcome.state === "paid") return false;
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.onlinePayment.updateMany({
      where: { id: onlinePaymentId, status: { in: [OnlinePaymentStatus.PENDING, OnlinePaymentStatus.FAILED] } },
      data: { status: OnlinePaymentStatus.ABANDONED },
    });
    if (claimed.count === 0) return false;
    const attempt = await tx.onlinePayment.findUniqueOrThrow({ where: { id: onlinePaymentId } });
    const reservation = await tx.reservation.findUnique({ where: { id: attempt.reservationId }, select: { status: true } });
    return reservation?.status === "DRAFT";
  });
}

/** The guest gave up on the booking entirely. */
export async function cancelUnpaid(onlinePaymentId: string): Promise<boolean> {
  const outcome = await settleAttempt(onlinePaymentId).catch(() => ({ state: "unknown" }) as SettleOutcome);
  if (outcome.state === "paid") return false;
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.onlinePayment.updateMany({
      where: { id: onlinePaymentId, status: { in: [OnlinePaymentStatus.PENDING, OnlinePaymentStatus.FAILED] } },
      data: { status: OnlinePaymentStatus.ABANDONED },
    });
    if (claimed.count === 0) return false;
    const attempt = await tx.onlinePayment.findUniqueOrThrow({ where: { id: onlinePaymentId } });
    await releaseDraft(attempt.reservationId, tx);
    return true;
  });
}

/* ------------------------------------------------------------ refunds */

/** Cents still refundable: paid, less refunds done or under way. */
export async function refundableCents(onlinePaymentId: string, db: Db = prisma): Promise<number> {
  const attempt = await db.onlinePayment.findUnique({
    where: { id: onlinePaymentId },
    select: { amountCents: true, status: true, refunds: { where: { status: { in: ["PENDING", "SUCCEEDED"] } }, select: { amountCents: true } } },
  });
  if (!attempt || attempt.status !== "SUCCEEDED") return 0;
  return attempt.amountCents - attempt.refunds.reduce((sum, r) => sum + r.amountCents, 0);
}

export async function requestRefund(input: {
  onlinePaymentId: string;
  amountCents: number;
  reason?: string;
  requestedById: string;
}): Promise<{ refundRowId: string }> {
  const attempt = await prisma.onlinePayment.findUnique({ where: { id: input.onlinePaymentId } });
  if (!attempt || attempt.status !== "SUCCEEDED" || !attempt.paymentId) {
    throw new OnlinePaymentError("Only a completed online payment can be refunded.");
  }
  if (input.amountCents < 100) throw new OnlinePaymentError("The smallest refund is Rs. 1.00.");

  // Reserve the amount first, inside a transaction, so two clicks cannot both
  // pass the "is there enough left" check.
  const row = await prisma.$transaction(
    async (tx) => {
      const left = await refundableCents(attempt.id, tx);
      if (input.amountCents > left) {
        throw new OnlinePaymentError(`Only ${(left / 100).toLocaleString("en-LK", { minimumFractionDigits: 2 })} ${attempt.currency} is left to refund.`);
      }
      return tx.onlineRefund.create({
        data: {
          onlinePaymentId: attempt.id,
          amountCents: input.amountCents,
          reason: input.reason ?? null,
          requestedById: input.requestedById,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  let refund: PlkRefund;
  try {
    refund = await PaymentsLk.createRefund(
      { paymentId: attempt.paymentId, amountCents: input.amountCents, ...(input.reason ? { reason: input.reason } : {}) },
      `refund:${row.id}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payments.lk refused the refund.";
    await prisma.onlineRefund.update({ where: { id: row.id }, data: { status: "FAILED", failureMessage: message.slice(0, 500) } });
    throw new OnlinePaymentError(
      error instanceof PaymentsLkError && error.status !== null && error.status < 500
        ? `Payments.lk refused the refund: ${message} (Card payments can only be refunded from the next bank working day after they were paid.)`
        : "Payments.lk could not be reached. Nothing was refunded; please try again.",
    );
  }
  await prisma.onlineRefund.update({ where: { id: row.id }, data: { refundId: refund.id } });
  await applyRefundState(refund);
  return { refundRowId: row.id };
}

/**
 * Records where a refund has got to. On success, the money going back is
 * written to the folio as a negative card payment so the balance is right.
 */
export async function applyRefundState(refund: Pick<PlkRefund, "id" | "status" | "failureMessage">): Promise<void> {
  const status =
    refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" ? "FAILED" : refund.status === "canceled" ? "CANCELED" : null;
  if (!status) return;

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.onlineRefund.updateMany({
      where: { refundId: refund.id, status: "PENDING" },
      data: { status, failureMessage: refund.failureMessage ?? null },
    });
    if (claimed.count === 0 || status !== "SUCCEEDED") return;

    const row = await tx.onlineRefund.findUniqueOrThrow({ where: { refundId: refund.id }, include: { onlinePayment: true } });
    const invoice = await getOrCreateInvoice(row.onlinePayment.reservationId, tx);
    const folioPayment = await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: new Prisma.Decimal(-row.amountCents).dividedBy(100),
        currencyCode: row.onlinePayment.currency,
        method: PaymentMethod.CREDIT_CARD,
        status: PaymentStatus.CLEARED,
        gatewayRef: `payments.lk refund ${refund.id}`,
      },
    });
    await tx.onlineRefund.update({ where: { id: row.id }, data: { folioPaymentId: folioPayment.id } });
    await tx.onlinePayment.update({
      where: { id: row.onlinePaymentId },
      data: { refundedCents: { increment: row.amountCents } },
    });
  });
}

/* -------------------------------------------------------------- sweep */

/**
 * Catches anything a lost webhook left behind: attempts still PENDING well
 * after their checkout closed are read back from the gateway and settled.
 * Cheap when there is nothing to do; called in the background.
 */
export async function sweepStaleAttempts(limit = 5): Promise<void> {
  const stale = await prisma.onlinePayment.findMany({
    where: { status: "PENDING", checkoutId: { not: null }, expiresAt: { lt: new Date(Date.now() - 5 * 60_000) } },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  for (const { id } of stale) {
    try {
      await settleAttempt(id);
    } catch (error) {
      console.error("sweepStaleAttempts:", id, error instanceof Error ? error.message : error);
    }
  }
}

/* -------------------------------------------------------- lookups */

export async function findAttemptForEvent(obj: Record<string, unknown>): Promise<string | null> {
  const reference = typeof obj.reference === "string" ? obj.reference : null;
  const checkoutId =
    typeof obj.checkoutId === "string" ? obj.checkoutId : obj.object === "checkout" && typeof obj.id === "string" ? obj.id : null;
  const paymentId = obj.object === "payment" && typeof obj.id === "string" ? obj.id : typeof obj.paymentId === "string" ? obj.paymentId : null;

  const attempt = await prisma.onlinePayment.findFirst({
    where: {
      OR: [
        ...(reference ? [{ id: reference }] : []),
        ...(checkoutId ? [{ checkoutId }] : []),
        ...(paymentId ? [{ paymentId }] : []),
      ],
    },
    select: { id: true },
  });
  return attempt?.id ?? null;
}
