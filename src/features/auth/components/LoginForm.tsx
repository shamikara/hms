"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "../actions/auth.actions";
import { resendVerificationAction } from "../actions/account.actions";
import { Notice, authButton, authInput, authLabel } from "./auth-ui";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResent(false);
    const result = await loginAction({ email: email.trim(), password }, next);
    if (result?.success && "redirectTo" in result && result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
      return;
    }
    setError(result?.error ?? "We could not sign you in just now. Please try again.");
    setNeedsConfirmation(Boolean(result && "needsConfirmation" in result && result.needsConfirmation));
    setBusy(false);
  };

  const resend = async () => {
    setBusy(true);
    const result = await resendVerificationAction({ email: email.trim() });
    setBusy(false);
    if (result.success) {
      setResent(true);
      setError(null);
    } else setError(result.error ?? "Could not send the link.");
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      {resent && <Notice tone="success">We&apos;ve sent a new confirmation link. Check your inbox (and spam folder).</Notice>}

      <div>
        <label htmlFor="login-email" className={authLabel}>Email</label>
        <input id="login-email" type="email" autoComplete="email" required disabled={busy} value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} placeholder="you@example.com" />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="login-password" className={authLabel}>Password</label>
          <Link href="/forgot-password" className="text-xs font-medium text-emerald-700 hover:text-emerald-600">Forgot password?</Link>
        </div>
        <input id="login-password" type="password" autoComplete="current-password" required disabled={busy} value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
      </div>

      <button type="submit" disabled={busy || !email || !password} className={authButton}>
        {busy ? "Signing in..." : "Sign in"}
      </button>

      {needsConfirmation && !resent && (
        <button type="button" onClick={resend} disabled={busy || !email} className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm font-semibold text-stone-700 hover:border-emerald-600 hover:text-emerald-700">
          Send the confirmation link again
        </button>
      )}
    </form>
  );
}
