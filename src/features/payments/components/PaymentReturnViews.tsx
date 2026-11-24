"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelUnpaidBooking, keepBookingAsRequest, resumeCheckout } from "../actions/checkout.actions";

/** Re-asks the server every few seconds while the bank finishes up. */
export function AutoRefresh({ seconds = 3, maxTries = 12 }: { seconds?: number; maxTries?: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= maxTries) return;
    const t = setTimeout(() => {
      setTries((n) => n + 1);
      router.refresh();
    }, seconds * 1000);
    return () => clearTimeout(t);
  }, [tries, maxTries, seconds, router]);
  return tries >= maxTries ? (
    <p className="text-sm text-stone-400">
      This is taking longer than usual. You’ll get an email as soon as the payment is confirmed. Please don’t pay twice.
    </p>
  ) : null;
}

export function UnpaidChoices({ op, token, canResume }: { op: string; token: string; canResume: boolean }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"request" | "cancelled" | null>(null);

  if (done === "request") {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-serif text-white">Request sent</h2>
        <p className="text-stone-300">
          We’re holding the room and our team will confirm with you by email or phone. You can pay when you arrive.
          A copy of your request is on its way to your inbox.
        </p>
        <button onClick={() => router.push("/")} className="mt-2 px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm">
          Back to home
        </button>
      </div>
    );
  }
  if (done === "cancelled") {
    return (
      <div className="space-y-3">
        <h2 className="text-2xl font-serif text-white">Booking cancelled</h2>
        <p className="text-stone-300">Nothing was charged and the room has been released.</p>
        <button onClick={() => router.push("/book")} className="mt-2 px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm">
          Start a new booking
        </button>
      </div>
    );
  }

  const go = (fn: () => Promise<{ success: boolean; error?: string; data?: { url: string } }>, after: (d?: { url: string }) => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.success) after(r.data);
      else setError(r.error ?? "That did not work.");
    });
  };

  return (
    <div className="space-y-4">
      {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm p-3">{error}</div>}
      <div className="grid gap-3">
        {canResume && (
          <button
            disabled={isPending}
            onClick={() => go(() => resumeCheckout(op, token), (d) => d && (window.location.href = d.url))}
            className="w-full py-4 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
          >
            Try the payment again
          </button>
        )}
        <button
          disabled={isPending}
          onClick={() => go(() => keepBookingAsRequest(op, token), () => setDone("request"))}
          className="w-full py-4 rounded-lg border border-stone-700 hover:border-emerald-600 text-stone-100 font-medium disabled:opacity-50"
        >
          Send it as a request instead, and pay at the resort
        </button>
        <button
          disabled={isPending}
          onClick={() => go(() => cancelUnpaidBooking(op, token), () => setDone("cancelled"))}
          className="w-full py-3 rounded-lg text-stone-400 hover:text-red-300 text-sm disabled:opacity-50"
        >
          Cancel this booking
        </button>
      </div>
    </div>
  );
}
