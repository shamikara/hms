import Link from "next/link";
import { format } from "date-fns";
import { Lightbulb } from "lucide-react";
import { VehicleStatus } from "@prisma/client";
import { getFleetDashboardAction } from "@/features/fleet/actions/analytics.actions";
import { AlertPanel } from "@/features/fleet/components/AlertPanel";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import {
  DataNotice,
  EmptyState,
  MetricTile,
  SectionCard,
  ServiceDueBadge,
  StarDisplay,
  TableShell,
  Td,
  Th,
  ValidityBadge,
  humaniseEnum,
} from "@/features/fleet/components/FleetPrimitives";
import { formatRating } from "@/features/fleet/lib/rating";
import type { RankedEntity } from "@/features/fleet/services/analytics.service";

export const dynamic = "force-dynamic";

export default async function FleetDashboardPage() {
  const result = await getFleetDashboardAction();

  if (!result.success || !result.data) {
    return (
      <FleetUnavailable
        message={result.error ?? "The fleet dashboard could not be loaded."}
      />
    );
  }

  const { dashboard, alerts, insights, propertyId, propertyName, currencyCode, canSeeCosts } =
    result.data;
  const { fleet, operations, maintenance, documents, ratings, costs } = dashboard;

  return (
    <div className="space-y-6">
      <p className="text-xs font-mono uppercase tracking-wider text-stone-400">
        {propertyName}
      </p>

      {/* Fleet status */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricTile label="Total vehicles" value={fleet.total} sub={`${fleet.archived} archived`} />
        <MetricTile
          label="Available"
          value={fleet.byStatus[VehicleStatus.AVAILABLE]}
          tone="emerald"
        />
        <MetricTile label="Reserved" value={fleet.byStatus[VehicleStatus.RESERVED]} />
        <MetricTile
          label="On safari"
          value={fleet.byStatus[VehicleStatus.ON_SAFARI]}
          tone="amber"
          sub={`${fleet.byStatus[VehicleStatus.RETURNING]} returning`}
        />
        <MetricTile
          label="Maintenance"
          value={fleet.byStatus[VehicleStatus.MAINTENANCE]}
          sub={`${maintenance.inWorkshop} job(s) open`}
        />
        <MetricTile
          label="Out of service"
          value={
            fleet.byStatus[VehicleStatus.OUT_OF_SERVICE] +
            fleet.byStatus[VehicleStatus.RETIRED]
          }
          tone="red"
        />
      </div>

      {/* Operations */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          label="Today's safaris"
          value={operations.todayTotal}
          sub={`${operations.todayByStatus.COMPLETED} completed today`}
        />
        <MetricTile label="Active now" value={operations.active} tone="amber" />
        <MetricTile label="Upcoming" value={operations.upcoming} />
        <MetricTile
          label="Completed (30d)"
          value={operations.completedLast30Days}
          tone="emerald"
        />
      </div>

      <AlertPanel propertyId={propertyId} alerts={alerts} canManage />

      {/* Quality monitoring */}
      <SectionCard
        title="Quality monitoring"
        subtitle="Observations generated only where the sample is large enough to mean something."
      >
        {insights.length === 0 ? (
          <EmptyState message="No quality observations yet. Insights appear once vehicles and drivers accumulate enough guest reviews." />
        ) : (
          <ul className="space-y-2">
            {insights.slice(0, 12).map((insight, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-950/40 px-4 py-2.5"
              >
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                <span className="text-xs text-stone-700 dark:text-stone-300">{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Ratings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Guest ratings"
          subtitle="Ranked on a confidence-adjusted (Bayesian) score, so a thin 5.0 cannot outrank a well-evidenced 4.8."
        >
          <div className="mb-4 flex items-center justify-between rounded-xl bg-stone-50 dark:bg-stone-950/50 px-4 py-3">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                Fleet average
              </p>
              <p className="mt-1 font-serif text-2xl text-stone-900 dark:text-white">
                {formatRating(ratings.fleetAverage)}
              </p>
            </div>
            <p className="text-xs text-stone-500">
              {ratings.reviewCount} review{ratings.reviewCount === 1 ? "" : "s"}
            </p>
          </div>

          {ratings.insufficientDataReason ? (
            <DataNotice message={ratings.insufficientDataReason} />
          ) : (
            <div className="space-y-4">
              <RankedList title="Top vehicles" entries={ratings.topVehicles} href="vehicles" />
              <RankedList
                title="Vehicles needing attention"
                entries={ratings.lowVehicles}
                href="vehicles"
              />
              <RankedList title="Top drivers" entries={ratings.topDrivers} href="drivers" />
              <RankedList
                title="Drivers needing attention"
                entries={ratings.lowDrivers}
                href="drivers"
              />
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Operating costs"
          subtitle={`Fuel and maintenance over the last ${costs.periodDays} days.`}
        >
          {!canSeeCosts ? (
            <DataNotice message="Your role does not include access to cost figures." />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label={`Fuel (${currencyCode})`}
                  value={costs.fuelCost.toFixed(2)}
                  sub={`${costs.fuelRecords} fill-up(s), ${costs.fuelLitres.toFixed(1)} L`}
                />
                <MetricTile
                  label={`Maintenance (${currencyCode})`}
                  value={costs.maintenanceCost.toFixed(2)}
                  sub={`${costs.maintenanceRecords} job(s)`}
                />
                <MetricTile
                  label="Distance driven"
                  value={`${costs.distanceKm.toLocaleString()} km`}
                  sub="From completed trips"
                />
                <MetricTile
                  label={`Cost per km (${currencyCode})`}
                  value={costs.costPerKm !== null ? costs.costPerKm.toFixed(3) : "—"}
                  tone={costs.costPerKm !== null ? "emerald" : "default"}
                />
              </div>
              {costs.insufficientDataReason && (
                <DataNotice message={costs.insufficientDataReason} />
              )}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Maintenance + documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Service schedule"
          subtitle="Derived from the next-service date and odometer target on the last completed job."
        >
          {maintenance.overdue.length === 0 && maintenance.dueSoon.length === 0 ? (
            <div className="space-y-2">
              <EmptyState message="No vehicle is due or overdue for service." />
              {maintenance.unscheduled > 0 && (
                <DataNotice
                  message={`${maintenance.unscheduled} vehicle(s) have no next-service target recorded, so no due date can be derived for them.`}
                />
              )}
            </div>
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <Th>Vehicle</Th>
                  <Th>Odometer</Th>
                  <Th>Status</Th>
                  <Th>Detail</Th>
                </tr>
              </thead>
              <tbody>
                {[...maintenance.overdue, ...maintenance.dueSoon].map((entry) => (
                  <tr
                    key={entry.vehicleId}
                    className="border-b border-stone-100 dark:border-stone-800/70"
                  >
                    <Td>
                      <Link
                        href={`/admin/safari/fleet/vehicles/${entry.vehicleId}`}
                        className="text-xs font-medium hover:text-emerald-600"
                      >
                        {entry.label}
                      </Link>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">
                        {entry.currentMileage.toLocaleString()} km
                      </span>
                    </Td>
                    <Td>
                      <ServiceDueBadge status={entry.due.status} />
                    </Td>
                    <Td>
                      <span className="text-xs text-stone-500">{entry.due.reason}</span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </SectionCard>

        <SectionCard
          title="Document compliance"
          subtitle="Insurance, revenue licence, emission and fitness certificates."
        >
          {documents.expired.length === 0 && documents.expiringSoon.length === 0 ? (
            <EmptyState message="No recorded document is expired or expiring within 30 days." />
          ) : (
            <TableShell>
              <thead>
                <tr className="border-b border-stone-200 dark:border-stone-800">
                  <Th>Vehicle</Th>
                  <Th>Document</Th>
                  <Th>Number</Th>
                  <Th>Expires</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {[...documents.expired, ...documents.expiringSoon].map((entry) => (
                  <tr
                    key={entry.documentId}
                    className="border-b border-stone-100 dark:border-stone-800/70"
                  >
                    <Td>
                      <Link
                        href={`/admin/safari/fleet/vehicles/${entry.vehicleId}`}
                        className="text-xs font-medium hover:text-emerald-600"
                      >
                        {entry.vehicleLabel}
                      </Link>
                    </Td>
                    <Td>
                      <span className="text-xs">{humaniseEnum(entry.type)}</span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">{entry.documentNumber}</span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">
                        {format(new Date(entry.expiryDate), "d MMM yyyy")}
                      </span>
                    </Td>
                    <Td>
                      <ValidityBadge status={entry.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function RankedList({
  title,
  entries,
  href,
}: {
  title: string;
  entries: RankedEntity[];
  href: "vehicles" | "drivers";
}) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {title}
      </p>
      {entries.length === 0 ? (
        <p className="mt-1 text-xs text-stone-400">Not enough reviews yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3">
              <Link
                href={`/admin/safari/fleet/${href}/${entry.id}`}
                className="truncate text-xs text-stone-700 hover:text-emerald-600 dark:text-stone-300"
              >
                {entry.label}
              </Link>
              <span className="flex shrink-0 items-center gap-2">
                <StarDisplay value={entry.average} count={entry.count} />
                <span className="font-mono text-[11px] text-stone-400">
                  adj {formatRating(entry.bayesian)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
