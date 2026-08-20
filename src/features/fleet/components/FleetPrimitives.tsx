import * as React from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatRating } from "../lib/rating";

/**
 * Presentational building blocks shared by the fleet screens.
 * Styling follows the existing admin pages: stone/emerald palette, rounded-2xl
 * cards, serif headings and mono uppercase micro-labels.
 */

export function SectionCard({
  title,
  action,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm",
        className
      )}
    >
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-stone-200 dark:border-stone-800">
        <div>
          <h2 className="text-base font-serif font-semibold text-stone-900 dark:text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function MetricTile({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "emerald" | "amber" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : tone === "red"
          ? "text-red-700 dark:text-red-400"
          : "text-stone-900 dark:text-white";

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
      <h3 className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </h3>
      <div className={cn("mt-2 text-3xl font-serif tracking-tight font-bold", toneClass)}>
        {value}
      </div>
      {sub && <p className="text-[11px] text-stone-400 mt-1">{sub}</p>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
      {message}
    </div>
  );
}

export function DataNotice({ message }: { message: string }) {
  return (
    <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">{message}</p>
  );
}

const VEHICLE_STATUS_VARIANT: Record<
  string,
  "emerald" | "amber" | "blue" | "destructive" | "secondary"
> = {
  AVAILABLE: "emerald",
  RESERVED: "blue",
  ON_SAFARI: "amber",
  RETURNING: "amber",
  MAINTENANCE: "secondary",
  OUT_OF_SERVICE: "destructive",
  RETIRED: "destructive",
};

const TRIP_STATUS_VARIANT: Record<
  string,
  "emerald" | "amber" | "blue" | "destructive" | "secondary"
> = {
  SCHEDULED: "secondary",
  CONFIRMED: "blue",
  IN_PROGRESS: "amber",
  COMPLETED: "emerald",
  CANCELLED: "destructive",
};

const VALIDITY_VARIANT: Record<string, "emerald" | "amber" | "destructive"> = {
  VALID: "emerald",
  EXPIRING_SOON: "amber",
  EXPIRED: "destructive",
};

const SERVICE_VARIANT: Record<string, "emerald" | "amber" | "destructive" | "secondary"> = {
  OK: "emerald",
  DUE_SOON: "amber",
  OVERDUE: "destructive",
  UNKNOWN: "secondary",
};

export function humaniseEnum(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function VehicleStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VEHICLE_STATUS_VARIANT[status] ?? "secondary"}>
      {humaniseEnum(status)}
    </Badge>
  );
}

export function TripStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={TRIP_STATUS_VARIANT[status] ?? "secondary"}>
      {humaniseEnum(status)}
    </Badge>
  );
}

export function ValidityBadge({ status }: { status: string }) {
  return (
    <Badge variant={VALIDITY_VARIANT[status] ?? "secondary"}>{humaniseEnum(status)}</Badge>
  );
}

export function ServiceDueBadge({ status }: { status: string }) {
  return (
    <Badge variant={SERVICE_VARIANT[status] ?? "secondary"}>
      {status === "UNKNOWN" ? "No schedule" : humaniseEnum(status)}
    </Badge>
  );
}

/**
 * Read-only star display. Shows an em dash rather than zero stars when there is
 * no rating, so "unrated" never looks like "rated badly".
 */
export function StarDisplay({
  value,
  count,
  size = "sm",
}: {
  value: number | null | undefined;
  count?: number;
  size?: "sm" | "md";
}) {
  const numeric =
    value === null || value === undefined || !Number.isFinite(Number(value))
      ? null
      : Number(value);

  if (numeric === null) {
    return (
      <span className="text-xs text-stone-400 dark:text-stone-500">
        Not yet rated
      </span>
    );
  }

  const starClass = size === "md" ? "w-4 h-4" : "w-3 h-3";

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((slot) => (
          <Star
            key={slot}
            className={cn(
              starClass,
              slot <= Math.round(numeric)
                ? "fill-amber-400 text-amber-400"
                : "text-stone-300 dark:text-stone-700"
            )}
          />
        ))}
      </span>
      <span className="text-xs font-mono text-stone-600 dark:text-stone-300">
        {formatRating(numeric)}
        {count !== undefined && (
          <span className="text-stone-400"> ({count})</span>
        )}
      </span>
    </span>
  );
}

export function TrendPill({
  direction,
  delta,
}: {
  direction: "IMPROVING" | "STABLE" | "DECLINING" | null;
  delta: number | null;
}) {
  if (direction === null || delta === null) {
    return (
      <span className="text-[11px] text-stone-400 dark:text-stone-500">
        Not enough reviews for a trend
      </span>
    );
  }
  const variant =
    direction === "IMPROVING" ? "emerald" : direction === "DECLINING" ? "destructive" : "secondary";
  const sign = delta > 0 ? "+" : "";
  return (
    <Badge variant={variant}>
      {humaniseEnum(direction)} {sign}
      {delta.toFixed(2)}
    </Badge>
  );
}

export function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 py-2 text-left text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 whitespace-nowrap",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 text-sm text-stone-700 dark:text-stone-300 align-middle",
        className
      )}
    >
      {children}
    </td>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[720px] border-collapse">{children}</table>
    </div>
  );
}
