"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, UtensilsCrossed } from "lucide-react";
import type { InHouseGuest } from "@/features/billing/actions/finance.actions";
import { addChargeAction } from "@/features/billing/actions/folio.actions";

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";

export function ChargeToRoom({
  guests,
  currencyCode,
  loadError,
}: {
  guests: InHouseGuest[];
  currencyCode: string;
  loadError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    reservationId: guests[0]?.reservationId ?? "",
    description: "",
    amount: "",
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const selected = guests.find((g) => g.reservationId === form.reservationId) ?? guests[0];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setError(null);

    startTransition(async () => {
      const result = await addChargeAction(selected.reservationId, {
        category: "F_AND_B",
        description: form.description,
        amount: form.amount,
      });

      if (result.success) {
        setToast(`Charged to ${selected.guestName}.`);
        setForm({ ...form, description: "", amount: "" });
        router.refresh();
      } else {
        setError(result.error ?? "That did not post.");
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">
          Dining &amp; Bar
        </h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
          Put food and drink on a guest&apos;s room. The charge lands on their folio and is settled
          at check-out.
        </p>
      </div>

      {(error || loadError) && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error ?? loadError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form
          onSubmit={submit}
          className="lg:col-span-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 space-y-4"
        >
          <h2 className="font-serif text-lg text-stone-900 dark:text-white flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-emerald-500" /> Charge to a room
          </h2>

          {guests.length === 0 ? (
            <p className="text-sm text-stone-500 py-6">
              Nobody is checked in at the moment, so there is no room to charge. Check a guest in
              from{" "}
              <Link href="/admin/bookings" className="text-emerald-500 hover:underline">
                Reservations
              </Link>
              .
            </p>
          ) : (
            <>
              <div>
                <label className={label}>Guest</label>
                <select
                  className={input}
                  value={form.reservationId}
                  onChange={(e) => setForm({ ...form, reservationId: e.target.value })}
                >
                  {guests.map((guest) => (
                    <option key={guest.reservationId} value={guest.reservationId}>
                      {guest.guestName}
                      {guest.roomNumbers.length > 0 ? ` — Room ${guest.roomNumbers.join(", ")}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className={label}>What was it</label>
                  <input
                    className={input}
                    required
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Dinner for two, two beers"
                  />
                </div>
                <div>
                  <label className={label}>Amount ({currencyCode})</label>
                  <input
                    className={input}
                    required
                    inputMode="decimal"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider transition-colors"
              >
                {isPending ? "Posting…" : "Post to Folio"}
              </button>
            </>
          )}
        </form>

        <section className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="font-serif text-lg text-stone-900 dark:text-white">In House</h2>
          </header>
          {guests.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-stone-500">Nobody is checked in.</p>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {guests.map((guest) => (
                <li key={guest.reservationId} className="px-6 py-3 flex justify-between items-center">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/bookings/${guest.reservationId}`}
                      className="text-sm text-stone-900 dark:text-stone-100 hover:text-emerald-500 transition-colors truncate block"
                    >
                      {guest.guestName}
                    </Link>
                    <span className="text-[11px] font-mono text-stone-500">{guest.reference}</span>
                  </div>
                  <span className="text-xs font-mono text-stone-500 shrink-0">
                    {guest.roomNumbers.join(", ") || "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-xs text-stone-500">
        This is not a till. There is no menu, no stock and no kitchen printing — it posts a charge
        to a folio, which is what the billing side needs from it.
      </p>
    </div>
  );
}
