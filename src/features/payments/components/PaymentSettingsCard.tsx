"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";
import type { PaymentSettingsView } from "../actions/payment-admin.actions";
import { updatePaymentSettings } from "../actions/payment-admin.actions";

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
      <span className={ok ? "text-stone-700 dark:text-stone-200" : "text-stone-500"}>{children}</span>
    </li>
  );
}

export function PaymentSettingsCard({ settings, loadError }: { settings: PaymentSettingsView | null; loadError?: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);
  const [advancePercent, setAdvance] = useState(String(settings?.advancePercent ?? 30));
  const [freeCancelDays, setDays] = useState(String(settings?.freeCancelDays ?? 7));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!settings) {
    return <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{loadError ?? "Payment settings could not be loaded."}</div>;
  }
  const ready = settings.keysConfigured && settings.webhookConfigured;

  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm">
      <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
        <CreditCard className="w-4 h-4 text-emerald-500" />
        <h2 className="font-serif text-lg text-stone-900 dark:text-white">Online Payments (Payments.lk)</h2>
        {settings.mode && (
          <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${settings.mode === "live" ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-700"}`}>
            {settings.mode === "live" ? "LIVE keys" : "TEST keys"}
          </span>
        )}
      </header>
      <form
        className="p-6 space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(null);
          start(async () => {
            const r = await updatePaymentSettings({ enabled, advancePercent, freeCancelDays });
            setMessage(r.success ? { ok: true, text: enabled ? "Saved. Guests can now pay online." : "Saved. Online payment is off." } : { ok: false, text: r.error ?? "That did not save." });
            if (r.success) router.refresh();
          });
        }}
      >
        <ul className="space-y-1.5">
          <Check ok={settings.keysConfigured}>Secret key set (PAYMENTS_LK_SECRET_KEY)</Check>
          <Check ok={settings.webhookConfigured}>Webhook signing secret set (PAYMENTS_LK_WEBHOOK_SECRET)</Check>
        </ul>
        <div className="text-xs text-stone-500">
          Webhook URL to add in the Payments.lk dashboard:{" "}
          <code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 select-all">{settings.webhookUrl}</code>
        </div>

        <label className="flex items-center gap-3 text-sm text-stone-800 dark:text-stone-100">
          <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={enabled} disabled={!ready && !enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Let guests pay online when they book
        </label>

        <div className="grid sm:grid-cols-2 gap-4 max-w-lg">
          <div>
            <label htmlFor="advance" className={label}>Advance (% of the stay)</label>
            <input id="advance" className={input} inputMode="numeric" value={advancePercent} onChange={(e) => setAdvance(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cancel-days" className={label}>Free cancellation (days before arrival)</label>
            <input id="cancel-days" className={input} inputMode="numeric" value={freeCancelDays} onChange={(e) => setDays(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">
          Guests choose to pay the advance, pay in full, or send a request and pay at the resort. A paid booking is
          confirmed automatically. If they cancel at least {freeCancelDays || "N"} days before arrival, refund them in full
          from the booking page; after that, the payment is non-refundable (set 0 for no free cancellation). Changes apply
          to new payments; each payment keeps the cut-off it was made under.
        </p>
        {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={isPending} className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl">
            Save payment settings
          </button>
        </div>
      </form>
    </section>
  );
}
