"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

/**
 * Small "Saved" style messages in the corner of the admin. Mount <ToastHost />
 * once; then call showToast("Driver saved.") from anywhere.
 */
type Tone = "success" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

let push: ((t: Omit<Toast, "id">) => void) | null = null;

export function showToast(message: string, tone: Tone = "success") {
  push?.({ message, tone });
}

export function ToastHost() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    let next = 1;
    push = (t) => {
      const id = next++;
      setToasts((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.tone === "error" ? 7000 : 4000);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
            t.tone === "success"
              ? "border-emerald-600/30 bg-white text-emerald-800 dark:bg-stone-900 dark:text-emerald-300"
              : "border-red-300 bg-white text-red-700 dark:bg-stone-900 dark:text-red-300"
          }`}
        >
          {t.tone === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1">{t.message}</span>
          <button type="button" aria-label="Dismiss" className="text-stone-400 hover:text-stone-700" onClick={() => setToasts((l) => l.filter((x) => x.id !== t.id))}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
