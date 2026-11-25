import type { ReactNode } from "react";

/** Shared look for the sign-in, sign-up and reset forms (safe in the browser). */
export const authInput =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:opacity-60";
export const authLabel = "mb-1.5 block text-sm font-medium text-stone-700";
export const authButton =
  "w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const style =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${style}`}>
      {children}
    </div>
  );
}
