"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/core/db/prisma";
import { PaymentsLk } from "../lib/payments-lk";
import { cancelUnpaid, keepAsRequest, settleAttempt, verifyAttempt } from "../services/online-payment.service";
import { notifyBookingPaid, notifyRequestFromAttempt } from "@/features/notifications/services/payment-notifications";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

const BAD_LINK = "This payment link is not valid. Please contact us and we'll sort it out.";

/** Back out of the card page but keep the booking: staff confirm it by hand. */
export async function keepBookingAsRequest(op: string, token: string): Promise<Result> {
  if (!verifyAttempt(op, token)) return { success: false, error: BAD_LINK };
  try {
    const kept = await keepAsRequest(op);
    if (!kept) {
      const outcome = await settleAttempt(op).catch(() => null);
      if (outcome?.state === "paid") return { success: false, error: "This booking has already been paid for, so it is confirmed." };
      return { success: false, error: "This booking's hold has already ended. Please make a new booking." };
    }
    after(() => notifyRequestFromAttempt(op));
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    console.error("keepBookingAsRequest failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not work. Please try again, or contact us." };
  }
}

/** Give up on the booking and free the room straight away. */
export async function cancelUnpaidBooking(op: string, token: string): Promise<Result> {
  if (!verifyAttempt(op, token)) return { success: false, error: BAD_LINK };
  try {
    const done = await cancelUnpaid(op);
    if (!done) {
      const outcome = await settleAttempt(op).catch(() => null);
      if (outcome?.state === "paid") return { success: false, error: "This booking has already been paid for. Contact us to cancel it." };
    }
    revalidatePath("/admin/bookings");
    return { success: true };
  } catch (error) {
    console.error("cancelUnpaidBooking failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not work. Please try again, or contact us." };
  }
}

/** Back to the same card page, while its checkout is still open. */
export async function resumeCheckout(op: string, token: string): Promise<Result<{ url: string }>> {
  if (!verifyAttempt(op, token)) return { success: false, error: BAD_LINK };
  const attempt = await prisma.onlinePayment.findUnique({ where: { id: op }, select: { status: true, checkoutId: true, checkoutUrl: true } });
  if (!attempt?.checkoutId || !attempt.checkoutUrl || attempt.status !== "PENDING") {
    return { success: false, error: "This payment can't be resumed. Please make a new booking." };
  }
  try {
    const checkout = await PaymentsLk.getCheckout(attempt.checkoutId);
    if (checkout.status !== "open") {
      const outcome = await settleAttempt(op);
      if (outcome.state === "paid") {
        after(() => (outcome.firstTime ? notifyBookingPaid(op) : undefined));
        return { success: false, error: "This booking is already paid and confirmed." };
      }
      return { success: false, error: "The payment window has closed. Please make a new booking." };
    }
    return { success: true, data: { url: attempt.checkoutUrl } };
  } catch (error) {
    console.error("resumeCheckout failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Payments.lk could not be reached. Please try again in a moment." };
  }
}
