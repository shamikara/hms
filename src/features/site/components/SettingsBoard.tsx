"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Mail, Percent, Plus, Star, Trash2 } from "lucide-react";
import type { SiteSettings } from "@/features/site/services/site.service";
import {
  saveContactSettings,
  saveRatingSettings,
  saveTaxSetting,
} from "@/features/site/actions/site.actions";

type Action = () => Promise<{ success: boolean; error?: string }>;

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";
const card =
  "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm";
const saveButton =
  "px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors";

interface RatingRow {
  platform: string;
  score: string;
  outOf: string;
  count: string;
}

export function SettingsBoard({
  settings,
  loadError,
}: {
  settings: SiteSettings | null;
  loadError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState(() => ({
    phone: settings?.contact.phone ?? "",
    phoneDisplay: settings?.contact.phoneDisplay ?? "",
    email: settings?.contact.email ?? "",
    alertEmail: settings?.contact.alertEmail ?? "",
    street: settings?.contact.street ?? "",
    locality: settings?.contact.locality ?? "",
    region: settings?.contact.region ?? "",
    postalCode: settings?.contact.postalCode ?? "",
  }));
  const [ratings, setRatings] = useState<RatingRow[]>(() =>
    (settings?.ratings ?? []).map((r) => ({
      platform: r.platform,
      score: String(r.score),
      outOf: String(r.outOf),
      count: String(r.count),
    })),
  );
  const [tax, setTax] = useState(settings?.taxPercent === null || !settings ? "" : String(settings.taxPercent));

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const run = (action: Action, message: string) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(message);
        router.refresh();
      } else {
        setError(result.error ?? "That did not save.");
      }
    });
  };

  if (!settings) {
    return (
      <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm">
        {loadError ?? "Settings could not be loaded."}
      </div>
    );
  }

  const field = (key: keyof typeof contact, text: string, placeholder?: string, hint?: string) => (
    <div>
      <label htmlFor={`contact-${key}`} className={label}>{text}</label>
      <input
        id={`contact-${key}`}
        className={input}
        value={contact[key]}
        placeholder={placeholder}
        onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
      />
      {hint && <p className="text-[11px] text-stone-500 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Site Settings</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
          What the public website says about how to reach you, the scores it shows, and the tax
          applied to guest bills. Changes show on the website within a minute.
        </p>
      </div>

      {error && (
        <div role="alert" className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* --------------------------------------------------------- contact */}
      <section className={card}>
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-emerald-500" />
          <h2 className="font-serif text-lg text-stone-900 dark:text-white">Contact Details</h2>
        </header>
        <form
          className="p-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveContactSettings(contact), "Contact details saved.");
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("phoneDisplay", "Phone (as shown)", "+94 77 732 0237")}
            {field("phone", "Phone (for dialling)", "+94777320237", "Plus sign and country code, no spaces.")}
            {field("email", "Public email", "reservations@example.com")}
            {field(
              "alertEmail",
              "Booking alerts to",
              "Leave blank to use the public email",
              "Where new booking requests are emailed.",
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("street", "Street")}
            {field("locality", "Town")}
            {field("region", "Province")}
            {field("postalCode", "Postal code")}
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className={saveButton}>
              Save contact details
            </button>
          </div>
        </form>
      </section>

      {/* --------------------------------------------------------- ratings */}
      <section className={card}>
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Star className="w-4 h-4 text-emerald-500" />
            <h2 className="font-serif text-lg text-stone-900 dark:text-white">Guest Ratings</h2>
          </div>
          <button
            type="button"
            disabled={ratings.length >= 8}
            onClick={() => setRatings((r) => [...r, { platform: "", score: "", outOf: "10", count: "" }])}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" /> Add platform
          </button>
        </header>
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveRatingSettings(ratings), "Guest ratings saved.");
          }}
        >
          <p className="text-xs text-stone-500">
            Copy each score exactly as the platform shows it. These also feed the star rating search
            engines display, so an inflated number is a risk, not a boost.
          </p>
          {ratings.length === 0 && (
            <p className="text-sm text-stone-500">No ratings. The ratings section will be hidden on the website.</p>
          )}
          {ratings.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-12 sm:col-span-4">
                <label htmlFor={`rating-platform-${i}`} className={label}>Platform</label>
                <input
                  id={`rating-platform-${i}`}
                  className={input}
                  value={row.platform}
                  placeholder="Booking.com"
                  onChange={(e) => setRatings((r) => r.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label htmlFor={`rating-score-${i}`} className={label}>Score</label>
                <input
                  id={`rating-score-${i}`}
                  className={input}
                  inputMode="decimal"
                  value={row.score}
                  onChange={(e) => setRatings((r) => r.map((x, j) => (j === i ? { ...x, score: e.target.value } : x)))}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label htmlFor={`rating-outof-${i}`} className={label}>Out of</label>
                <select
                  id={`rating-outof-${i}`}
                  className={input}
                  value={row.outOf}
                  onChange={(e) => setRatings((r) => r.map((x, j) => (j === i ? { ...x, outOf: e.target.value } : x)))}
                >
                  <option value="10">10</option>
                  <option value="5">5</option>
                </select>
              </div>
              <div className="col-span-4 sm:col-span-3">
                <label htmlFor={`rating-count-${i}`} className={label}>Reviews</label>
                <input
                  id={`rating-count-${i}`}
                  className={input}
                  inputMode="numeric"
                  value={row.count}
                  onChange={(e) => setRatings((r) => r.map((x, j) => (j === i ? { ...x, count: e.target.value } : x)))}
                />
              </div>
              <div className="col-span-12 sm:col-span-1 flex sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRatings((r) => r.filter((_, j) => j !== i))}
                  aria-label={`Remove ${row.platform || "this platform"}`}
                  className="p-2.5 rounded-xl text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className={saveButton}>
              Save ratings
            </button>
          </div>
        </form>
      </section>

      {/* ------------------------------------------------------------- tax */}
      <section className={card}>
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2.5">
          <Percent className="w-4 h-4 text-emerald-500" />
          <h2 className="font-serif text-lg text-stone-900 dark:text-white">Tax on Guest Bills</h2>
        </header>
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveTaxSetting({ taxPercent: tax.trim() }), tax.trim() ? "Tax rate saved." : "Tax rate cleared.");
          }}
        >
          <div className="max-w-xs">
            <label htmlFor="tax-percent" className={label}>Tax rate (%)</label>
            <input
              id="tax-percent"
              className={input}
              inputMode="decimal"
              value={tax}
              placeholder="Not set"
              onChange={(e) => setTax(e.target.value)}
            />
          </div>
          <p className="text-xs text-stone-500">
            Applied to charges posted from now on. Charges already on a bill keep the tax they were
            posted with. Leave blank and bills say &ldquo;tax not configured&rdquo; rather than
            showing a zero.
          </p>
          <div className="flex justify-end">
            <button type="submit" disabled={isPending} className={saveButton}>
              Save tax rate
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
