import { NextResponse, after } from "next/server";
import { revalidatePath } from "next/cache";
import prisma from "@/core/db/prisma";
import { PaymentsLk, eventObject, verifyWebhook } from "@/features/payments/lib/payments-lk";
import { applyRefundState, findAttemptForEvent, settleAttempt } from "@/features/payments/services/online-payment.service";
import { notifyBookingPaid } from "@/features/notifications/services/payment-notifications";

export const dynamic = "force-dynamic";

/**
 * Payments.lk webhook. Set this URL in the Payments.lk dashboard:
 *   https://<site>/api/payments/payments-lk
 *
 * The signature is checked on the raw body before anything is parsed. The
 * event body is then only used to find which booking it is about: every
 * decision re-reads the payment from Payments.lk itself, so a forged or
 * replayed body could not mark anything paid even if it got past the check.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYMENTS_LK_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("payments-lk webhook: PAYMENTS_LK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const raw = await request.text();
  if (raw.length > 256_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const event = verifyWebhook(raw, request.headers.get("payments-signature"), secret);
  if (!event) return NextResponse.json({ error: "bad signature" }, { status: 400 });

  if (event.type === "test.ping") return NextResponse.json({ received: true });

  // Already handled: answer OK so Payments.lk stops retrying.
  const seen = await prisma.paymentWebhookEvent.findUnique({ where: { id: event.id }, select: { id: true } });
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    const obj = eventObject(event);
    switch (event.type) {
      case "payment.succeeded":
      case "payment.failed":
      case "checkout.expired": {
        const attemptId = await findAttemptForEvent(obj);
        if (!attemptId) break; // Not one of ours (a payment link, say).
        const outcome = await settleAttempt(attemptId);
        if (outcome.state === "paid" && outcome.firstTime) after(() => notifyBookingPaid(attemptId));
        revalidatePath("/admin/bookings", "layout");
        break;
      }
      case "refund.succeeded":
      case "refund.failed":
      case "refund.canceled": {
        if (typeof obj.id === "string") {
          const known = await prisma.onlineRefund.findUnique({ where: { refundId: obj.id }, select: { id: true } });
          if (!known) {
            // A refund on one of our payments whose id we have not stored yet
            // (the webhook beat our own write): fail so it is delivered again.
            const ours =
              typeof obj.paymentId === "string" &&
              (await prisma.onlinePayment.findUnique({ where: { paymentId: obj.paymentId }, select: { id: true } }));
            if (ours) throw new Error("refund not recorded yet; retry");
            break;
          }
          await applyRefundState(await PaymentsLk.getRefund(obj.id));
          revalidatePath("/admin/bookings", "layout");
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    // A 500 makes Payments.lk retry later; nothing above is harmful to repeat.
    console.error("payments-lk webhook failed:", event.type, event.id, error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  await prisma.paymentWebhookEvent.create({ data: { id: event.id, type: event.type } }).catch(() => undefined);
  return NextResponse.json({ received: true });
}
