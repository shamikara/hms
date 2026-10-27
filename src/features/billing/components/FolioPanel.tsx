"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LineItemCategory, PaymentMethod } from "@prisma/client";
import { AlertTriangle, CheckCircle2, Plus, Receipt, Wallet } from "lucide-react";
import type { Folio } from "@/features/billing/services/folio.service";
import {
  addChargeAction,
  closeFolioAction,
  postRoomChargesAction,
  recordPaymentAction,
} from "@/features/billing/actions/folio.actions";

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";

const CATEGORY_LABELS: Record<LineItemCategory, string> = {
  ROOM_RATE: "Room",
  F_AND_B: "Food & drink",
  SAFARI: "Safari",
  SPA: "Spa",
  OTHER: "Other",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CREDIT_CARD: "Card",
  BANK_TRANSFER: "Bank transfer",
};

export function FolioPanel({
  reservationId,
  folio,
  canManage,
}: {
  reservationId: string;
  folio: Folio;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [charge, setCharge] = useState({
    category: "F_AND_B" as LineItemCategory,
    description: "",
    amount: "",
  });
  const [payment, setPayment] = useState({
    amount: folio.balance !== "0.00" ? folio.balance : "",
    method: "CASH" as PaymentMethod,
    reference: "",
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(message);
        after?.();
        router.refresh();
      } else {
        setError(result.error ?? "That did not work.");
      }
    });
  };

  const money = (value: string) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: folio.currencyCode,
    }).format(Number(value));

  const owes = Number(folio.balance) > 0;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-emerald-500" />
            <h2 className="font-serif text-lg text-stone-900 dark:text-white">Folio</h2>
            {folio.status && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                  folio.status === "CLOSED"
                    ? "bg-stone-100 dark:bg-stone-800 text-stone-500"
                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {folio.status}
              </span>
            )}
          </div>

          {canManage && !folio.roomChargesPosted && (
            <button
              onClick={() => run(() => postRoomChargesAction(reservationId), "Room charges posted.")}
              disabled={isPending}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors"
            >
              Post Room Charges
            </button>
          )}
        </header>

        {!folio.taxConfigured && (
          <p className="px-6 py-3 bg-amber-500/10 border-b border-amber-700/30 text-xs text-amber-600 dark:text-amber-400">
            No tax rate is set for this property, so these totals carry no tax. Set one under Room
            Inventory if the property charges it — this is not the same as tax being zero.
          </p>
        )}

        {folio.lines.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">
            Nothing has been charged yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-mono text-stone-500 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-6 py-3">Charge</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3 text-right">Net</th>
                  <th className="px-6 py-3 text-right">Tax</th>
                  <th className="px-6 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {folio.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-6 py-3 text-stone-900 dark:text-stone-100">{line.description}</td>
                    <td className="px-6 py-3 text-xs font-mono text-stone-500">
                      {CATEGORY_LABELS[line.category]}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-stone-600 dark:text-stone-300">
                      {money(line.subtotal)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-stone-500">{money(line.tax)}</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-stone-900 dark:text-stone-100">
                      {money(line.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/50 space-y-1.5 text-sm">
          <Row label="Charges" value={money(folio.total)} />
          <Row label="Paid" value={`− ${money(folio.paid)}`} />
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-between items-center">
            <span className="font-medium text-stone-900 dark:text-white">Balance</span>
            <span
              className={`text-xl font-serif font-semibold ${
                owes ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {money(folio.balance)}
            </span>
          </div>
        </div>
      </section>

      {folio.payments.length > 0 && (
        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-emerald-500" />
            <h2 className="font-serif text-lg text-stone-900 dark:text-white">Payments</h2>
          </header>
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {folio.payments.map((p) => (
              <li key={p.id} className="px-6 py-3 flex justify-between items-center text-sm">
                <span className="text-stone-600 dark:text-stone-300">
                  {METHOD_LABELS[p.method]}
                  <span className="text-xs text-stone-500 font-mono ml-2">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </span>
                <span className="font-mono font-medium text-stone-900 dark:text-stone-100">
                  {money(p.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canManage && folio.status !== "CLOSED" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addChargeAction(reservationId, charge), "Charge added.", () =>
                setCharge({ ...charge, description: "", amount: "" }),
              );
            }}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 space-y-4"
          >
            <h3 className="font-serif text-lg text-stone-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" /> Add a charge
            </h3>
            <div>
              <label className={label}>What for</label>
              <input
                className={input}
                required
                value={charge.description}
                onChange={(e) => setCharge({ ...charge, description: e.target.value })}
                placeholder="Dinner for two"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Category</label>
                <select
                  className={input}
                  value={charge.category}
                  onChange={(e) => setCharge({ ...charge, category: e.target.value as LineItemCategory })}
                >
                  {Object.entries(CATEGORY_LABELS)
                    .filter(([key]) => key !== "ROOM_RATE")
                    .map(([key, text]) => (
                      <option key={key} value={key}>
                        {text}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={label}>Amount ({folio.currencyCode})</label>
                <input
                  className={input}
                  required
                  inputMode="decimal"
                  value={charge.amount}
                  onChange={(e) => setCharge({ ...charge, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider transition-colors"
            >
              Add Charge
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => recordPaymentAction(reservationId, payment), "Payment recorded.", () =>
                setPayment({ ...payment, amount: "", reference: "" }),
              );
            }}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 space-y-4"
          >
            <h3 className="font-serif text-lg text-stone-900 dark:text-white flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-500" /> Take a payment
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Amount ({folio.currencyCode})</label>
                <input
                  className={input}
                  required
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={label}>Method</label>
                <select
                  className={input}
                  value={payment.method}
                  onChange={(e) => setPayment({ ...payment, method: e.target.value as PaymentMethod })}
                >
                  {Object.entries(METHOD_LABELS).map(([key, text]) => (
                    <option key={key} value={key}>
                      {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Reference (optional)</label>
              <input
                className={input}
                value={payment.reference}
                onChange={(e) => setPayment({ ...payment, reference: e.target.value })}
                placeholder="Receipt or transfer number"
              />
            </div>
            <p className="text-[11px] text-stone-500">
              Recorded as money already received. There is no card gateway connected, so nothing is
              charged to a card from here.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider transition-colors"
            >
              Record Payment
            </button>
          </form>
        </div>
      )}

      {canManage && folio.status === "OPEN" && folio.lines.length > 0 && (
        <button
          onClick={() => run(() => closeFolioAction(reservationId), "Folio closed.")}
          disabled={isPending || owes}
          title={owes ? "Take the outstanding balance first" : undefined}
          className="w-full py-3 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 text-stone-600 dark:text-stone-300 hover:text-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-[11px] font-mono uppercase tracking-wider transition-colors"
        >
          {owes ? `${money(folio.balance)} outstanding` : "Close Folio"}
        </button>
      )}
    </div>
  );
}

function Row({ label: text, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-stone-600 dark:text-stone-400">
      <span>{text}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
