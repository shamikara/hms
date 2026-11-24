import { createElement } from "react";
import type { NextRequest } from "next/server";
import { requireAdminPermission, resolveDefaultPropertyId, type AdminPermission } from "@/features/admin/lib/requireAdminSession";
import { getSiteContent } from "@/features/site/services/site.service";
import { getOccupancyGrid } from "@/features/admin/actions/calendar.actions";
import { parsePeriod } from "@/features/reports/lib/period";
import { getBookingsReport, getRevenueReport } from "@/features/reports/services/report-data.service";
import { errorResponse, generatedStamp, pdfResponse } from "@/features/reports/services/render";
import { BookingsPdf } from "@/features/reports/pdf/BookingsPdf";
import { RevenuePdf } from "@/features/reports/pdf/RevenuePdf";
import { OccupancyPdf } from "@/features/reports/pdf/OccupancyPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERMISSION: Record<string, AdminPermission> = {
  bookings: "reservations:view",
  occupancy: "reservations:view",
  revenue: "finance:view",
};

/**
 * GET /admin/reports/{bookings|revenue}?from=yyyy-mm-dd&to=yyyy-mm-dd
 * GET /admin/reports/occupancy?month=yyyy-mm
 *
 * The /admin prefix already requires a staff sign-in at the proxy; each
 * report also checks the specific permission, exactly as the screens do.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const permission = PERMISSION[kind];
  if (!permission) return errorResponse("Unknown report.", 404);

  const guard = await requireAdminPermission(permission);
  if (!guard.ok) return errorResponse(guard.failure.error, 403);

  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return errorResponse("No property is configured yet.", 404);

  const search = request.nextUrl.searchParams;
  const { contact } = await getSiteContent();
  const generatedAt = generatedStamp();

  try {
    if (kind === "occupancy") {
      const month = search.get("month") ?? "";
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return errorResponse("Choose a month.");
      const [y, m] = month.split("-").map(Number);
      const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const grid = await getOccupancyGrid(`${month}-01`, days, propertyId);
      if (!grid.success || !grid.data) return errorResponse(grid.error ?? "Could not load occupancy.", 500);
      const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
      return pdfResponse(
        createElement(OccupancyPdf, { grid: grid.data, monthLabel, contact, generatedAt }),
        `wildlily-occupancy-${month}.pdf`,
      );
    }

    const period = parsePeriod(search.get("from"), search.get("to"));
    if ("error" in period) return errorResponse(period.error);
    const name = `${period.from}_to_${period.to}`;

    if (kind === "bookings") {
      const report = await getBookingsReport(propertyId, period);
      return pdfResponse(createElement(BookingsPdf, { report, period, contact, generatedAt }), `wildlily-bookings-${name}.pdf`);
    }

    const report = await getRevenueReport(propertyId, period);
    return pdfResponse(createElement(RevenuePdf, { report, period, contact, generatedAt }), `wildlily-revenue-${name}.pdf`);
  } catch (error) {
    console.error(`report ${kind} failed:`, error instanceof Error ? error.message : error);
    return errorResponse("The report could not be generated. Please try again.", 500);
  }
}
