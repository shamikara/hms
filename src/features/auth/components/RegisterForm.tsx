"use client";

import { useState } from "react";
import { registerAction } from "../actions/account.actions";
import { Notice, authButton, authInput, authLabel } from "./AuthShell";

const EMPTY = { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", website: "" };

export function RegisterForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await registerAction(form);
    if (result.success) {
      // Signed in already: go straight to the account page.
      window.location.assign(result.redirectTo ?? "/account");
      return;
    }
    setBusy(false);
    setError(result.error ?? "Could not create your account.");
  };


  return (
    <form onSubmit={submit} className="relative space-y-4" noValidate>
      {error && <Notice tone="error">{error}</Notice>}

      {/* Honeypot: off-screen, skipped by keyboard and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-first" className={authLabel}>First name</label>
          <input id="reg-first" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} className={authInput} />
        </div>
        <div>
          <label htmlFor="reg-last" className={authLabel}>Last name</label>
          <input id="reg-last" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} className={authInput} />
        </div>
      </div>
      <div>
        <label htmlFor="reg-email" className={authLabel}>Email</label>
        <input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} className={authInput} placeholder="Use the one you booked with" />
      </div>
      <div>
        <label htmlFor="reg-password" className={authLabel}>Password</label>
        <input id="reg-password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} className={authInput} />
        <p className="mt-1 text-xs text-stone-500">At least 10 characters. A short sentence is easy to remember.</p>
      </div>
      <div>
        <label htmlFor="reg-confirm" className={authLabel}>Confirm password</label>
        <input id="reg-confirm" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set("confirmPassword")} className={authInput} />
      </div>

      <button type="submit" disabled={busy} className={authButton}>
        {busy ? "Creating your account..." : "Create account"}
      </button>
      <p className="text-xs text-stone-500 text-center">
        Booked with us before? Use the same email. After a quick code check on your account page, your bookings appear there.
      </p>
    </form>
  );
}
