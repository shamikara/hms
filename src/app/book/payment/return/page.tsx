import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { PaymentPageShell } from "@/features/payments/components/PaymentPageShell";
import { AutoRefresh } from "@/features/payments/components/PaymentReturnViews";
import { settleAttempt, verifyAttempt, type SettleOutcome } from "@/features/payments/services/online-payment.service";
import { loadPaidDetails, notifyBookingPaid } from "@/features/notifications/services/payment-notifications";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payment", robots: { index: false, follow: false } };

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function day(d: Date) {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ op?: string; t?: string }> }) {
  const { op, t } = await searchParams;
  if (!verifyAttempt(op, t)) {
    return (
      <PaymentPageShell>
        <h1 className="text-2xl font-serif text-white mb-3">Link not recognised</h1>
        <p className="text-stone-400">If you’ve just paid, you’ll get a confirmation email shortly. Otherwise please contact us.</p>
      </PaymentPageShell>
    );
  }

  let outcome: SettleOutcome;
  try {
    outcome = await settleAttempt(op);
  } catch (error) {
    console.error("payment return settle failed:", error instanceof Error ? error.message : error);
    outcome = { state: "pending" };
  }
  if (outcome.state === "paid" && outcome.firstTime) after(() => notifyBookingPaid(op));
  if (outcome.state === "failed" || outcome.state === "abandoned") redirect(`/book/payment/cancelled?op=${encodeURIComponent(op)}&t=${t}`);

  if (outcome.state === "paid") {
    const d = await loadPaidDetails(op);
    const balance = d && d.totalCents !== null ? Math.max(0, d.totalCents - d.paidCents) : null;
    return (
      <PaymentPageShell>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-900/40 text-emerald-400 flex items-center justify-center text-4xl">✓</div>
          <h1 className="text-3xl font-serif text-white mb-2">You’re booked{d ? `, ${d.guest.firstName}` : ""}!</h1>
          <p className="text-stone-400">Payment received and your room is confirmed. A confirmation is on its way to your email.</p>
        </div>
        {d && (
          <dl className="mt-8 divide-y divide-stone-800 text-sm">
            {[
              ["Reference", <span key="r" className="font-mono text-white">{d.reference}</span>],
              ["Dates", `${day(d.checkInDate)} → ${day(d.checkOutDate)}`],
              ["Rooms", d.roomTypeNames.join(", ")],
              ["Paid", `${money(d.paidCents, d.currency)}${d.card ? ` · ${d.card}` : ""}`],
              ...(balance !== null ? [["To pay at the resort", balance === 0 ? "Nothing — all paid" : money(balance, d.currency)]] : []),
            ].map(([k, v]) => (
              <div key={String(k)} className="flex justify-between gap-4 py-3">
                <dt className="text-stone-500">{k}</dt>
                <dd className="text-stone-200 text-right">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {d && (
          <p className="mt-6 text-xs text-stone-500 leading-relaxed">
            {d.freeCancelUntil
              ? `Free cancellation until ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(d.freeCancelUntil)}. After that, the payment is non-refundable.`
              : "This payment is non-refundable."}{" "}
            To change or cancel, just reply to the confirmation email or WhatsApp us.
          </p>
        )}
        <div className="mt-8 text-center">
          <Link href="/" className="inline-block px-8 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm">Back to home</Link>
        </div>
      </PaymentPageShell>
    );
  }

  if (outcome.state === "expired") {
    return (
      <PaymentPageShell>
        <h1 className="text-2xl font-serif text-white mb-3">The payment window closed</h1>
        <p className="text-stone-400 mb-6">Nothing was charged and the room was released. You’re welcome to book again.</p>
        <Link href="/book" className="inline-block px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm">Book again</Link>
      </PaymentPageShell>
    );
  }

  return (
    <PaymentPageShell>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full border-4 border-emerald-800 border-t-emerald-400 animate-spin" aria-hidden />
        <h1 className="text-2xl font-serif text-white">Confirming your payment…</h1>
        <p className="text-stone-400">This usually takes a few seconds. Please keep this page open and don’t pay again.</p>
        <AutoRefresh />
      </div>
    </PaymentPageShell>
  );
}
