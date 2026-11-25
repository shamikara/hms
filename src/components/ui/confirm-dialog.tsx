"use client";

import * as React from "react";
import { AlertTriangle, Info, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * One warning box for the whole admin, instead of the browser's grey
 * "OK / Cancel" popups (which look alarming, cannot explain much and block the
 * page). Mount <ConfirmHost /> once; then anywhere:
 *
 *   if (!(await confirmAction({ title: "Cancel this booking?", message: "…", confirmLabel: "Cancel booking" }))) return;
 *   showNotice({ title: "Could not archive", message: error });
 */

export type ConfirmTone = "danger" | "warning";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface Request extends ConfirmOptions {
  kind: "confirm" | "notice";
  resolve: (ok: boolean) => void;
}

let push: ((r: Request) => void) | null = null;

/** Asks the question; resolves true only if the person confirms. */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!push) {
    // No host mounted (should not happen in the admin): fall back safely.
    return Promise.resolve(typeof window !== "undefined" && window.confirm(options.title));
  }
  return new Promise((resolve) => push!({ ...options, kind: "confirm", resolve }));
}

/** A message with a single OK button, for errors after an action. */
export function showNotice(options: Omit<ConfirmOptions, "cancelLabel">): Promise<void> {
  if (!push) {
    if (typeof window !== "undefined") window.alert(options.title);
    return Promise.resolve();
  }
  return new Promise((resolve) => push!({ tone: "warning", ...options, kind: "notice", resolve: () => resolve() }));
}

export function ConfirmHost() {
  const [queue, setQueue] = React.useState<Request[]>([]);
  const current = queue[0] ?? null;

  React.useEffect(() => {
    push = (r) => setQueue((q) => [...q, r]);
    return () => {
      push = null;
    };
  }, []);

  const finish = (ok: boolean) => {
    if (!current) return;
    current.resolve(ok);
    setQueue((q) => q.slice(1));
  };

  const tone = current?.tone ?? "danger";
  const Icon = current?.kind === "notice" ? (tone === "danger" ? AlertTriangle : Info) : tone === "danger" ? Trash2 : AlertTriangle;
  const iconWrap =
    tone === "danger"
      ? "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400";
  const confirmBtn =
    tone === "danger" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-amber-600 hover:bg-amber-500 text-white";

  return (
    <Dialog open={!!current} onOpenChange={(o) => !o && finish(false)}>
      {current && (
        <DialogContent className="max-w-md">
          <div className="flex gap-4">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconWrap}`}>
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 space-y-2">
              <DialogTitle className="text-base font-semibold text-stone-900 dark:text-white">{current.title}</DialogTitle>
              {current.message ? (
                <DialogDescription asChild>
                  <div className="text-sm leading-relaxed text-stone-600 dark:text-stone-300">{current.message}</div>
                </DialogDescription>
              ) : (
                <DialogDescription className="sr-only">{current.title}</DialogDescription>
              )}
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            {current.kind === "confirm" ? (
              <>
                <button
                  type="button"
                  autoFocus
                  onClick={() => finish(false)}
                  className="rounded-lg border border-stone-200 dark:border-stone-700 px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {current.cancelLabel ?? "Keep it"}
                </button>
                <button type="button" onClick={() => finish(true)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${confirmBtn}`}>
                  {current.confirmLabel ?? "Yes, continue"}
                </button>
              </>
            ) : (
              <button
                type="button"
                autoFocus
                onClick={() => finish(true)}
                className="rounded-lg bg-stone-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-stone-900"
              >
                OK
              </button>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
