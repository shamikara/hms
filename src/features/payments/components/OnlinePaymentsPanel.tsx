"use client";

import { showToast } from "@/components/ui/toast";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CreditCard, RefreshCw, RotateCcw } from "lucide-react";
import type { OnlinePaymentRow } from "../actions/payment-admin.actions";
import { recheckOnlinePayment, refundOnlinePayment } from "../actions/payment-admin.actions";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Waiting for payment", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  SUCCEEDED: { label: "Paid", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  FAILED: { label: "Failed", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  EXPIRED: { label: "Expired unpaid", cls: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400" },
  ABANDONED: { label: "Not paid (kept as request / cancelled)", cls: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400" },
};
const REFUND: Record<string, string> = { PENDING: "Processing", SUCCEEDED: "Refunded", FAILED: "Failed", CANCELED: "Cancelled" };

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function when(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }).format(new Date(iso));
}

function RefundForm({ row, onDone }: { row: OnlinePaymentRow; onDone: (msg: string) => void }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const suggested = row.withinFreeCancel ? row.refundableCents : 0;
  const [amount, setAmount] = useState(suggested ? (suggested / 100).toFixed(2) : "");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    start(async () => {
      const r = await refundOnlinePayment({ onlinePaymentId: row.id, amount, reason });
      if (r.success) {
        setConfirm(false);
        onDone(`Refund of ${row.currency} ${Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })} sent to Payments.lk.`);
        router.refresh();
      } else setError(r.error ?? "The refund failed.");
    });
  };

  return (
    <div className="mt-4 rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
      <div className="text-sm font-medium text-stone-800 dark:text-stone-100 flex items-center gap-2">
        <RotateCcw className="w-4 h-4" /> Refund to the guest&apos;s card
      </div>
      <p className="text-xs text-stone-500">
        {row.freeCancelUntil
          ? row.withinFreeCancel
            ? `Within the free-cancellation period (until ${when(row.freeCancelUntil)}): the policy gives a full refund.`
            : `Past the free-cancellation date (${when(row.freeCancelUntil)}): by the policy this payment is non-refundable. You can still refund as a goodwill gesture.`
          : "No free-cancellation period applied to this payment."}{" "}
        Up to {money(row.refundableCents, row.currency)} can be refunded.
      </p>
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs text-stone-500 flex items-center gap-2">
          Amount ({row.currency})
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setConfirm(false);
            }}
            className="w-32 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-1.5 text-sm"
          />
        </label>
        <button type="button" className="text-xs underline text-stone-500" onClick={() => setAmount((row.refundableCents / 100).toFixed(2))}>
          All
        </button>
        <input
          placeholder="Reason (optional, e.g. cancelled 10 days before)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          className="flex-1 min-w-[14rem] rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-3 py-1.5 text-sm"
        />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!confirm ? (
        <button
          disabled={!amount || Number(amount) <= 0}
          onClick={() => setConfirm(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40"
        >
          Refund…
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-700 dark:text-stone-200">
            Send {row.currency} {Number(amount).toLocaleString("en-LK", { minimumFractionDigits: 2 })} back to the card? This cannot be undone.
          </span>
          <button disabled={isPending} onClick={submit} className="px-3 py-1.5 rounded-lg bg-red-600 text-white disabled:opacity-50">
            {isPending ? "Sending…" : "Yes, refund"}
          </button>
          <button onClick={() => setConfirm(false)} className="px-3 py-1.5 rounded-lg border border-stone-300 dark:border-stone-700">
            Keep
          </button>
        </div>
      )}
      <p className="text-[11px] text-stone-400">
        Payments.lk can only refund a card payment from the next bank working day after it was made. The refund shows on the bill once Payments.lk confirms it.
      </p>
    </div>
  );
}

export function OnlinePaymentsPanel({ rows, canManage }: { rows: OnlinePaymentRow[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
      <header className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-emerald-600" />
        <h2 className="font-serif text-lg text-stone-900 dark:text-white">Online payments</h2>
        <span className="text-xs text-stone-500">via Payments.lk</span>
      </header>

      {rows.map((row) => {
        const s = STATUS[row.status] ?? { label: row.status, cls: "" };
        return (
          <div key={row.id} className="rounded-xl border border-stone-100 dark:border-stone-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-medium text-stone-900 dark:text-white">{money(row.amountCents, row.currency)}</span>
                <span className="text-xs text-stone-500">{row.kind === "FULL" ? "full payment" : "advance"}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                {row.mode === "test" && <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">TEST</span>}
              </div>
              {canManage && row.status === "PENDING" && (
                <button
                  disabled={isPending}
                  onClick={() =>
                    start(async () => {
                      const r = await recheckOnlinePayment(row.id);
                      if (r.success) showToast(`Checked with Payments.lk: ${r.data?.state}.`);
                      else showToast(r.error ?? "Check failed.", "error");
                      router.refresh();
                    })
                  }
                  className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-emerald-600"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Check status now
                </button>
              )}
            </div>
            <div className="mt-1 text-xs text-stone-500 space-x-3">
              <span>Started {when(row.createdAt)}</span>
              {row.paidAt && <span>Paid {when(row.paidAt)}</span>}
              {row.card && <span>{row.card}</span>}
              {row.refundedCents > 0 && <span className="text-red-600">Refunded {money(row.refundedCents, row.currency)}</span>}
              {row.paymentId && <span className="font-mono">{row.paymentId}</span>}
            </div>
            {row.attentionNote && (
              <div className="mt-3 flex gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {row.attentionNote}
              </div>
            )}
            {row.refunds.length > 0 && (
              <ul className="mt-3 text-xs space-y-1">
                {row.refunds.map((f) => (
                  <li key={f.id} className="flex flex-wrap gap-2 text-stone-600 dark:text-stone-400">
                    <span>Refund {money(f.amountCents, row.currency)}</span>
                    <span className="font-semibold">{REFUND[f.status] ?? f.status}</span>
                    <span>{when(f.createdAt)}</span>
                    {f.reason && <span>· {f.reason}</span>}
                    {f.failureMessage && <span className="text-red-600">· {f.failureMessage}</span>}
                  </li>
                ))}
              </ul>
            )}
            {canManage && row.status === "SUCCEEDED" && row.refundableCents > 0 && <RefundForm row={row} onDone={(m) => showToast(m)} />}
          </div>
        );
      })}
    </section>
  );
}
