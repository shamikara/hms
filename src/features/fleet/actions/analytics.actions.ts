"use server";

import { revalidatePath } from "next/cache";
import { requireFleetPermission } from "../lib/authz";
import { getPropertyContext, resolveActivePropertyId } from "../lib/property";
import {
  actionError,
  actionOk,
  isConnectivityError,
  type FleetActionResult,
} from "../lib/actionResult";
import { AlertAcknowledgeSchema } from "../validations/fleet.schema";
import { AnalyticsService, type FleetDashboardData } from "../services/analytics.service";
import { AlertService } from "../services/alert.service";
import type { AlertRow } from "../repositories/alert.repository";

export interface FleetDashboardPayload {
  propertyId: string;
  propertyName: string;
  currencyCode: string;
  dashboard: FleetDashboardData;
  alerts: AlertRow[];
  insights: string[];
  /** True when the caller may see cost figures. */
  canSeeCosts: boolean;
}

/**
 * One round trip for the whole fleet dashboard.
 *
 * The alert sweep runs here (throttled to once every 15 minutes per property by
 * a `Setting` row) so compliance warnings stay current without a cron job. The
 * sweep failing must never take the dashboard down with it.
 */
export async function getFleetDashboardAction(
  propertyId?: string
): Promise<FleetActionResult<FleetDashboardPayload>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const resolved = await resolveActivePropertyId(actor, propertyId);

    try {
      await AlertService.sweepThrottled(resolved);
    } catch {
      // Advisory only — the dashboard renders from live data regardless.
    }

    const [dashboard, alerts, insights, property] = await Promise.all([
      AnalyticsService.getFleetDashboard(resolved),
      AlertService.list(resolved, 25),
      AnalyticsService.getQualityInsights(resolved),
      getPropertyContext(resolved),
    ]);

    const canSeeCosts = actor.permissions.includes("fleet:cost");

    return actionOk({
      propertyId: resolved,
      propertyName: property?.name ?? "Property",
      currencyCode: property?.baseCurrency ?? dashboard.costs.currencyCode,
      dashboard,
      alerts,
      insights,
      canSeeCosts,
    });
  } catch (error) {
    if (isConnectivityError(error)) {
      return {
        success: false,
        error:
          "The fleet database is unreachable, so no operational figures can be shown.",
        code: "DB_UNAVAILABLE",
      };
    }
    return actionError(error, "getFleetDashboardAction");
  }
}

export async function listFleetAlertsAction(
  propertyId?: string
): Promise<FleetActionResult<{ propertyId: string; alerts: AlertRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const resolved = await resolveActivePropertyId(actor, propertyId);
    const alerts = await AlertService.list(resolved, 100);
    return actionOk({ propertyId: resolved, alerts });
  } catch (error) {
    if (isConnectivityError(error)) {
      return {
        success: false,
        error: "The fleet database is unreachable right now.",
        code: "DB_UNAVAILABLE",
      };
    }
    return actionError(error, "listFleetAlertsAction");
  }
}

/** Acknowledge (silence) or resolve (close) an alert. */
export async function updateFleetAlertAction(
  input: unknown
): Promise<FleetActionResult<AlertRow>> {
  try {
    await requireFleetPermission("fleet:manage");
    const parsed = AlertAcknowledgeSchema.parse(input);
    const alert = await AlertService.setStatus(parsed.id, parsed.resolve);
    revalidatePath("/admin/safari/fleet");
    return actionOk(alert);
  } catch (error) {
    return actionError(error, "updateFleetAlertAction");
  }
}

/** Forces an immediate alert sweep, bypassing the throttle. */
export async function refreshFleetAlertsAction(
  propertyId?: string
): Promise<FleetActionResult<{ raised: number; resolved: number }>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const resolved = await resolveActivePropertyId(actor, propertyId);
    const result = await AlertService.sweep(resolved);
    revalidatePath("/admin/safari/fleet");
    return actionOk({ raised: result.raised, resolved: result.resolved });
  } catch (error) {
    return actionError(error, "refreshFleetAlertsAction");
  }
}
