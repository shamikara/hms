"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestPasswordResetAction, resetPasswordAction } from "../actions/account.actions";
import { Notice, authButton, authInput, authLabel } from "./auth-ui";

/** Two steps on one page: email for a code, then the code and a new password. */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const result = await requestPasswordResetAction({ email: email.trim() });
    setBusy(false);
    if (!result.success) return setError(result.error ?? "Could not send the code.");
    setStep("code");
    setInfo(`If ${email.trim()} has an account, a 6-digit code is on its way. It works for 15 minutes.`);
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await resetPasswordAction({ email: email.trim(), code: code.replace(/\s/g, ""), password, confirmPassword });
    setBusy(false);
    if (result.success) router.push("/login?reset=done");
    else setError(result.error ?? "Could not change the password.");
  };

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="space-y-5">
        {error && <Notice tone="error">{error}</Notice>}
        <div>
          <label htmlFor="fp-email" className={authLabel}>Email</label>
          <input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={authInput} />
        </div>
        <button type="submit" disabled={busy || !email} className={authButton}>
          {busy ? "Sending..." : "Email me a code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={reset} className="space-y-5">
      {info && <Notice tone="info">{info}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      <div>
        <label htmlFor="fp-code" className={authLabel}>6-digit code</label>
        <input
          id="fp-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          className={`${authInput} text-center font-mono text-2xl tracking-[0.5em]`}
          placeholder="000000"
        />
      </div>
      <div>
        <label htmlFor="fp-password" className={authLabel}>New password</label>
        <input id="fp-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={authInput} />
        <p className="mt-1 text-xs text-stone-500">At least 10 characters.</p>
      </div>
      <div>
        <label htmlFor="fp-confirm" className={authLabel}>Confirm new password</label>
        <input id="fp-confirm" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={authInput} />
      </div>
      <button type="submit" disabled={busy || code.replace(/\s/g, "").length !== 6 || !password} className={authButton}>
        {busy ? "Saving..." : "Set new password"}
      </button>
      <div className="flex justify-between text-xs">
        <button type="button" onClick={() => { setStep("email"); setCode(""); setError(null); setInfo(null); }} className="text-stone-500 hover:text-stone-800">
          Use a different email
        </button>
        <button type="button" disabled={busy} onClick={() => sendCode()} className="font-semibold text-emerald-700 hover:text-emerald-600">
          Send a new code
        </button>
      </div>
    </form>
  );
}
