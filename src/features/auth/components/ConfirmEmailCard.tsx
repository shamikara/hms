"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailCheck } from "lucide-react";
import { confirmEmailCodeAction, requestEmailCodeAction } from "../actions/account.actions";

/**
 * Shown on the account page until the email is confirmed. One tap sends a
 * 6-digit code; entering it here reveals the bookings made with that email.
 */
export function ConfirmEmailCard({ email }: { email: string }) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    const r = await requestEmailCodeAction();
    setBusy(false);
    if (!r.success) return setError(r.error ?? "Could not send the code.");
    if (sent) setInfo("A new code is on its way.");
    setSent(true);
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await confirmEmailCodeAction({ code });
    if (!r.success) {
      setBusy(false);
      return setError(r.error ?? "That code did not work.");
    }
    router.refresh();
  };

  return (
    <section className="rounded-2xl bg-white p-6 ring-1 ring-amber-500/30 shadow-sm" aria-labelledby="confirm-email-title">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="confirm-email-title" className="font-semibold text-stone-900">Booked with us before? Confirm your email to see your stays</h2>
          <p className="mt-1 text-sm text-stone-600">
            We’ll send a 6-digit code to <strong className="text-stone-800 break-all">{email}</strong>. This keeps your bookings private.
          </p>

          {!sent ? (
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="mt-4 rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send me a code"}
            </button>
          ) : (
            <form onSubmit={confirm} className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="confirm-code" className="sr-only">6-digit code</label>
              <input
                id="confirm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-36 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? "Checking..." : "Confirm"}
              </button>
              <button type="button" onClick={send} disabled={busy} className="text-sm font-semibold text-emerald-700 hover:text-emerald-600">
                Send a new code
              </button>
            </form>
          )}
          {sent && !error && !info && <p className="mt-2 text-xs text-stone-500">Check your inbox (and spam). The code works for 15 minutes.</p>}
          {info && <p role="status" className="mt-2 text-sm text-emerald-700">{info}</p>}
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </section>
  );
}
