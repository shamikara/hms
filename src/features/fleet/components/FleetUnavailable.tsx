import * as React from "react";
import { AlertTriangle } from "lucide-react";

/**
 * Shown when a fleet page cannot load its data (database unreachable, or the
 * caller lacks permission). Deliberately shows the reason instead of falling
 * back to sample numbers — an invented fleet is worse than no fleet.
 */
export function FleetUnavailable({
  title = "Fleet data unavailable",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 dark:border-amber-900/50 dark:bg-amber-950/30">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <h2 className="font-serif text-lg text-amber-900 dark:text-amber-200">{title}</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{message}</p>
        </div>
      </div>
    </div>
  );
}
