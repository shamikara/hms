import type { Metadata } from "next";
import { redirect } from "next/navigation";
import prisma from "@/core/db/prisma";
import { PaymentPageShell } from "@/features/payments/components/PaymentPageShell";
import { UnpaidChoices } from "@/features/payments/components/PaymentReturnViews";
import { settleAttempt, verifyAttempt } from "@/features/payments/services/online-payment.service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment not completed", robots: { index: false, follow: false } };

export default async function PaymentCancelledPage({ searchParams }: { searchParams: Promise<{ op?: string; t?: string }> }) {
  const { op, t } = await searchParams;
  if (!verifyAttempt(op, t)) {
    return (
      <PaymentPageShell>
        <h1 className="text-2xl font-serif text-white mb-3">Link not recognised</h1>
        <p className="text-stone-400">Please contact us and we’ll help with your booking.</p>
      </PaymentPageShell>
    );
  }

  const outcome = await settleAttempt(op).catch(() => ({ state: "pending" as const }));
  if (outcome.state === "paid") redirect(`/book/payment/return?op=${encodeURIComponent(op)}&t=${t}`);

  const attempt = await prisma.onlinePayment.findUnique({
    where: { id: op },
    select: { status: true, expiresAt: true, reservation: { select: { status: true } } },
  });
  const open = attempt?.status === "PENDING" || attempt?.status === "FAILED";
  const held = attempt?.reservation.status === "DRAFT";

  if (!attempt || !open || !held) {
    return (
      <PaymentPageShell>
        <h1 className="text-2xl font-serif text-white mb-3">
          {attempt?.status === "ABANDONED" && held ? "Request sent" : "This booking is no longer held"}
        </h1>
        <p className="text-stone-400 mb-6">
          {attempt?.status === "ABANDONED" && held
            ? "We have your request and will confirm with you directly."
            : "Nothing was charged. You're welcome to book again."}
        </p>
        <a href="/book" className="inline-block px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm">Back to booking</a>
      </PaymentPageShell>
    );
  }

  const minutesLeft = Math.max(0, Math.round((attempt.expiresAt.getTime() - Date.now()) / 60_000));
  return (
    <PaymentPageShell>
      <h1 className="text-2xl font-serif text-white mb-2">Payment not completed</h1>
      <p className="text-stone-400 mb-6">
        No money was taken. {minutesLeft > 0 ? `We're holding your room for about ${minutesLeft} more minute${minutesLeft === 1 ? "" : "s"}.` : ""} What
        would you like to do?
      </p>
      <UnpaidChoices op={op} token={t!} canResume={attempt.status === "PENDING" && minutesLeft > 0} />
    </PaymentPageShell>
  );
}
