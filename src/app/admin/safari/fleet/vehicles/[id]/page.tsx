import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { getVehicleDetailAction } from "@/features/fleet/actions/vehicles.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { DocumentManager } from "@/features/fleet/components/DocumentManager";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import { FuelManager } from "@/features/fleet/components/FuelManager";
import { MaintenanceManager } from "@/features/fleet/components/MaintenanceManager";
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
  TrendPill,
  TripStatusBadge,
  VehicleStatusBadge,
  humaniseEnum,
} from "@/features/fleet/components/FleetPrimitives";
import { formatRating } from "@/features/fleet/lib/rating";

export const dynamic = "force-dynamic";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [detailResult, permissionsResult] = await Promise.all([
    getVehicleDetailAction(id),
    getMyFleetPermissionsAction(),
  ]);

  if (!detailResult.success || !detailResult.data) {
    return (
      <FleetUnavailable
        title="Vehicle unavailable"
        message={detailResult.error ?? "This vehicle could not be loaded."}
      />
    );
  }

  const { analytics, trips, maintenance, fuelLogs, documents, reviews, currencyCode } =
    detailResult.data;
  const { vehicle, efficiency, ratingProfile, operating, completedTrips, serviceDue, periodDays } =
    analytics;

  const permissions = permissionsResult.success ? permissionsResult.data?.permissions ?? [] : [];
  const canManage = permissions.includes("fleet:manage");
  const canSeeCosts = permissions.includes("fleet:cost");

  const vehicleOption = {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    displayName: vehicle.displayName,
    currentMileage: vehicle.currentMileage,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/admin/safari/fleet/vehicles"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-emerald-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to vehicles
      </Link>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl text-stone-900 dark:text-white">
              {vehicle.displayName ?? vehicle.plateNumber}
            </h2>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            <span className="font-mono">{vehicle.plateNumber}</span>
            {vehicle.make && ` · ${vehicle.make} ${vehicle.model ?? ""}`} ·{" "}
            {humaniseEnum(vehicle.vehicleType)} · {humaniseEnum(vehicle.fuelType)} ·{" "}
            {humaniseEnum(vehicle.ownershipType)}
            {vehicle.purchaseYear && ` · ${vehicle.purchaseYear}`}
          </p>
          {vehicle.notes && (
            <p className="mt-2 whitespace-pre-line text-xs text-stone-500 dark:text-stone-400">
              {vehicle.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <ServiceDueBadge status={serviceDue.status} />
          <StarDisplay
            value={ratingProfile.overallAverage}
            count={ratingProfile.count}
            size="md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile
          label="Odometer"
          value={`${vehicle.currentMileage.toLocaleString()} km`}
          sub={serviceDue.reason || "No service warning"}
        />
        <MetricTile
          label="Safari capacity"
          value={vehicle.safariCapacity ?? vehicle.capacity}
          sub={`${vehicle.capacity} seats total`}
        />
        <MetricTile
          label={`Completed trips (${periodDays}d)`}
          value={completedTrips}
          sub={`${operating.distanceKm.toLocaleString()} km logged`}
        />
        <MetricTile
          label="km / litre"
          value={efficiency.kmPerLitre !== null ? efficiency.kmPerLitre.toFixed(2) : "—"}
          sub={
            efficiency.kmPerLitre !== null
              ? `from ${efficiency.sampleSize} fuel records`
              : efficiency.insufficientDataReason
          }
          tone={efficiency.kmPerLitre !== null ? "emerald" : "default"}
        />
      </div>

      {canSeeCosts && (
        <SectionCard
          title="Operating cost"
          subtitle={`Fuel and maintenance over the last ${periodDays} days, against distance from completed trips.`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="Fuel" value={operating.fuelCost.toFixed(2)} />
            <MetricTile label="Maintenance" value={operating.maintenanceCost.toFixed(2)} />
            <MetricTile label="Total" value={operating.totalCost.toFixed(2)} />
            <MetricTile
              label="Cost per km"
              value={operating.costPerKm !== null ? operating.costPerKm.toFixed(3) : "—"}
              tone={operating.costPerKm !== null ? "emerald" : "default"}
            />
          </div>
          {operating.insufficientDataReason && (
            <div className="mt-3">
              <DataNotice message={operating.insufficientDataReason} />
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard
        title="Guest rating breakdown"
        subtitle="Category averages, trend across the two most recent review windows, and weak spots."
      >
        {!ratingProfile.hasEnoughData ? (
          <DataNotice
            message={`Only ${ratingProfile.count} review(s) so far — not enough to report category averages or a trend.`}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                  Average
                </p>
                <p className="font-serif text-xl">
                  {formatRating(ratingProfile.overallAverage)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                  Confidence adjusted
                </p>
                <p className="font-serif text-xl">{formatRating(ratingProfile.bayesian)}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                  Trend
                </p>
                <TrendPill
                  direction={ratingProfile.trend.direction}
                  delta={ratingProfile.trend.delta}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(ratingProfile.categories).map(([category, value]) => (
                <div
                  key={category}
                  className="flex items-center justify-between rounded-xl border border-stone-100 px-3 py-2 dark:border-stone-800"
                >
                  <span className="text-xs text-stone-600 dark:text-stone-400">
                    {category}
                  </span>
                  <StarDisplay value={value} />
                </div>
              ))}
            </div>

            {ratingProfile.weaknesses.length > 0 && (
              <ul className="space-y-1">
                {ratingProfile.weaknesses.map((weakness) => (
                  <li key={weakness.category} className="text-xs text-amber-700 dark:text-amber-400">
                    {weakness.category} sits {weakness.gap.toFixed(2)} stars below this
                    vehicle&apos;s own average.
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent guest reviews">
        {reviews.length === 0 ? (
          <EmptyState message="No guest reviews for this vehicle yet." />
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-stone-100 dark:border-stone-800 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                    {review.guest.firstName} {review.guest.lastName}
                    <span className="ml-2 font-mono text-[11px] text-stone-400">
                      {format(new Date(review.submittedAt), "d MMM yyyy")}
                    </span>
                  </span>
                  <StarDisplay value={review.vehicleOverall} />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  {review.trip.destination} · cleanliness {review.vehicleCleanliness} ·
                  comfort {review.vehicleComfort} · condition {review.vehicleCondition} ·
                  ride {review.vehicleRideQuality} · suitability {review.vehicleSuitability}
                </p>
                {review.comment && (
                  <p className="mt-2 text-xs italic text-stone-600 dark:text-stone-400">
                    “{review.comment}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Trip history">
        {trips.length === 0 ? (
          <EmptyState message="No trips recorded for this vehicle." />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <Th>Safari</Th>
                <Th>Departure</Th>
                <Th>Driver</Th>
                <Th>Guests</Th>
                <Th>Distance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr key={trip.id} className="border-b border-stone-100 dark:border-stone-800/70">
                  <Td>
                    <span className="text-xs">{trip.destination}</span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {format(new Date(trip.scheduledStart), "d MMM yyyy HH:mm")}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs">
                      {trip.driver.employee.firstName} {trip.driver.employee.lastName}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">{trip.guestCount}</span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {trip.distanceKm !== null ? `${trip.distanceKm} km` : "—"}
                    </span>
                  </Td>
                  <Td>
                    <TripStatusBadge status={trip.status} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <MaintenanceManager
        records={maintenance}
        vehicles={[vehicleOption]}
        currencyCode={currencyCode}
        canManage={canManage}
        lockedVehicleId={vehicle.id}
      />

      <FuelManager
        logs={fuelLogs}
        vehicles={[vehicleOption]}
        currencyCode={currencyCode}
        canManage={canManage}
        lockedVehicleId={vehicle.id}
        efficiencies={[
          {
            vehicleId: vehicle.id,
            label: vehicle.displayName ?? vehicle.plateNumber,
            efficiency,
          },
        ]}
      />

      <DocumentManager
        documents={documents}
        vehicles={[vehicleOption]}
        canManage={canManage}
        lockedVehicleId={vehicle.id}
      />
    </div>
  );
}
