"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { BellRing, Check, EyeOff, RefreshCw } from "lucide-react";
import { FleetAlertSeverity, FleetAlertStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, SectionCard, humaniseEnum } from "./FleetPrimitives";
import {
  refreshFleetAlertsAction,
  updateFleetAlertAction,
} from "../actions/analytics.actions";
import type { AlertRow } from "../repositories/alert.repository";

/**
 * Operational alerts. Acknowledge silences an alert without closing it; resolve
 * closes it. The sweep re-raises an acknowledged alert only if its severity
 * escalates, which is what keeps this from becoming noise.
 */

interface AlertPanelProps {
  propertyId: string;
  alerts: AlertRow[];
  canManage: boolean;
}

const SEVERITY_VARIANT: Record<FleetAlertSeverity, "destructive" | "amber" | "blue"> = {
  CRITICAL: "destructive",
  WARNING: "amber",
  INFO: "blue",
};

export function AlertPanel({ propertyId, alerts, canManage }: AlertPanelProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function update(alert: AlertRow, resolve: boolean) {
    setPending(true);
    const result = await updateFleetAlertAction({ id: alert.id, resolve });
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? "Could not update the alert.");
      return;
    }
    router.refresh();
  }

  async function refresh() {
    setPending(true);
    const result = await refreshFleetAlertsAction(propertyId);
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? "Could not refresh alerts.");
      return;
    }
    router.refresh();
  }

  return (
    <SectionCard
      title="Fleet alerts"
      subtitle="Service, compliance and quality warnings. Deduplicated, so the same condition never files twice."
      action={
        canManage && (
          <Button variant="outline" size="sm" onClick={refresh} disabled={pending}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Re-run checks
          </Button>
        )
      }
    >
      {alerts.length === 0 ? (
        <EmptyState message="No open alerts. Service schedules, documents, licences and ratings are all within thresholds." />
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 px-4 py-3"
            >
              <div className="flex items-start gap-3 min-w-0">
                <BellRing
                  className={
                    alert.severity === FleetAlertSeverity.CRITICAL
                      ? "w-4 h-4 mt-0.5 text-red-500 shrink-0"
                      : "w-4 h-4 mt-0.5 text-amber-500 shrink-0"
                  }
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                      {alert.title}
                    </span>
                    <Badge variant={SEVERITY_VARIANT[alert.severity]}>
                      {humaniseEnum(alert.severity)}
                    </Badge>
                    <Badge variant="outline">{humaniseEnum(alert.type)}</Badge>
                    {alert.status === FleetAlertStatus.ACKNOWLEDGED && (
                      <Badge variant="secondary">Acknowledged</Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
                    {alert.message}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1 font-mono">
                    raised {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1 shrink-0">
                  {alert.status === FleetAlertStatus.OPEN && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={pending}
                      onClick={() => update(alert, false)}
                    >
                      <EyeOff className="w-3 h-3 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="xs"
                    disabled={pending}
                    onClick={() => update(alert, true)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Resolve
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
