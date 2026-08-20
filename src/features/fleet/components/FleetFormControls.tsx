"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Minimal form controls for the fleet dialogs.
 *
 * Native `input`/`select`/`textarea` elements styled to match the admin theme,
 * rather than new Radix wrappers: the project has no `ui/select.tsx` or
 * `ui/input.tsx` yet, and adding a component library surface is outside the
 * scope of this change.
 */

const fieldClass =
  "w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 shadow-xs outline-none transition-colors placeholder:text-stone-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:opacity-60 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100";

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
        {required && <span className="text-emerald-600"> *</span>}
      </span>
      {children}
      {hint && !error && (
        <span className="block text-[11px] text-stone-400">{hint}</span>
      )}
      {error && <span className="block text-[11px] text-red-600">{error}</span>}
    </label>
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldClass, className)} {...props} />
));
TextInput.displayName = "TextInput";

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} rows={3} className={cn(fieldClass, className)} {...props} />
));
TextArea.displayName = "TextArea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(fieldClass, "pr-8", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

/** Options built from a Prisma enum object, humanised for display. */
export function EnumOptions({ values }: { values: readonly string[] }) {
  return (
    <>
      {values.map((value) => (
        <option key={value} value={value}>
          {value
            .split("_")
            .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
            .join(" ")}
        </option>
      ))}
    </>
  );
}

/** Interactive 1-5 star input used by the guest review form. */
export function StarInput({
  value,
  onChange,
  label,
  required,
  name,
}: {
  value: number | null;
  onChange: (value: number) => void;
  label: string;
  required?: boolean;
  name: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <span className="text-sm text-stone-700 dark:text-stone-300">
        {label}
        {required && <span className="text-emerald-600"> *</span>}
      </span>
      <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((slot) => (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={value === slot}
            aria-label={`${slot} star${slot === 1 ? "" : "s"} for ${label}`}
            name={name}
            onClick={() => onChange(slot)}
            className="p-0.5 cursor-pointer transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                "w-5 h-5",
                value !== null && slot <= value
                  ? "fill-amber-400 text-amber-400"
                  : "text-stone-300 dark:text-stone-600"
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
      {message}
    </div>
  );
}

export function ConflictList({ conflicts }: { conflicts: string[] }) {
  if (conflicts.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900/50 dark:bg-amber-950/40">
      <p className="text-[10px] font-mono uppercase tracking-wider text-amber-700 dark:text-amber-400">
        Assignment conflicts
      </p>
      <ul className="mt-1.5 space-y-1">
        {conflicts.map((conflict, index) => (
          <li key={index} className="text-xs text-amber-800 dark:text-amber-200">
            • {conflict}
          </li>
        ))}
      </ul>
    </div>
  );
}
