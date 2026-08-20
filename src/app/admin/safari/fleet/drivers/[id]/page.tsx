import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { DriverEmploymentStatus } from "@prisma/client";
import { getDriverDetailAction } from "@/features/fleet/actions/drivers.actions";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import { Badge } from "@/components/ui/badge";
import {
  DataNotice,
  EmptyState,
  MetricTile,
  SectionCard,
  StarDisplay,
  TableShell,
  Td,
  Th,
  TrendPill,
  TripStatusBadge,
  ValidityBadge,
  humaniseEnum,
} from "@/features/fleet/components/FleetPrimitives";
import {
  LICENSE_EXPIRY_WARNING_DAYS,
  validityStatus,
} from "@/features/fleet/lib/compliance";
import { formatRating } from "@/features/fleet/lib/rating";

export const dynamic = "force-dynamic";

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getDriverDetailAction(id);

  if (!result.success || !result.data) {
    return (
      <FleetUnavailable
        title="Driver unavailable"
        message={result.error ?? "This driver could not be loaded."}
      />
    );
  }

  const { driver, ratingProfile, trips, reviews } = result.data;
  const name = `${driver.employee.firstName} ${driver.employee.lastName}`;
  const licence = validityStatus(driver.licenseExpiry, LICENSE_EXPIRY_WARNING_DAYS);
  const completedTrips = trips.filter((trip) => trip.status === "COMPLETED").length;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/safari/fleet/drivers"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-emerald-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to drivers
      </Link>

      <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-serif text-2xl text-stone-900 dark:text-white">{name}</h2>
            <Badge
              variant={
                driver.employmentStatus === DriverEmploymentStatus.ACTIVE
                  ? "emerald"
                  : driver.employmentStatus === DriverEmploymentStatus.TERMINATED
                    ? "destructive"
                    : "amber"
              }
            >
              {humaniseEnum(driver.employmentStatus)}
            </Badge>
            <Badge variant={driver.isAvailable ? "emerald" : "secondary"}>
              {driver.isAvailable ? "Available" : "Off duty"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Staff {driver.employee.employeeId} · Licence{" "}
            <span className="font-mono">{driver.licenseNumber}</span> ·{" "}
            {driver.safariExperienceYears} year
            {driver.safariExperienceYears === 1 ? "" : "s"} of safari experience
          </p>
          {driver.notes && (
            <p className="mt-2 whitespace-pre-line text-xs text-stone-500 dark:text-stone-400">
              {driver.notes}
            </p>
          )}
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <ValidityBadge status={licence} />
            <span className="font-mono text-[11px] text-stone-400">
              expires {format(driver.licenseExpiry, "d MMM yyyy")}
            </span>
          </div>
          <StarDisplay
            value={ratingProfile.overallAverage}
            count={ratingProfile.count}
            size="md"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricTile label="Completed safaris" value={completedTrips} />
        <MetricTile label="Reviews" value={ratingProfile.count} />
        <MetricTile
          label="Average rating"
          value={formatRating(ratingProfile.overallAverage)}
        />
        <MetricTile
          label="Confidence adjusted"
          value={formatRating(ratingProfile.bayesian)}
          sub="Used for ranking"
        />
      </div>

      <SectionCard
        title="Rating breakdown"
        subtitle="Category averages, trend across the two most recent review windows, and weak spots."
      >
        {!ratingProfile.hasEnoughData ? (
          <DataNotice
            message={`Only ${ratingProfile.count} review(s) so far — not enough to report category averages or a trend.`}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                Trend
              </span>
              <TrendPill
                direction={ratingProfile.trend.direction}
                delta={ratingProfile.trend.delta}
              />
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
                  <li
                    key={weakness.category}
                    className="text-xs text-amber-700 dark:text-amber-400"
                  >
                    {name} scores consistently low on {weakness.category.toLowerCase()} —{" "}
                    {formatRating(weakness.average)}, which is {weakness.gap.toFixed(2)}{" "}
                    stars below their own average.
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent guest reviews">
        {reviews.length === 0 ? (
          <EmptyState message="No guest reviews for this driver yet." />
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-xl border border-stone-100 px-4 py-3 dark:border-stone-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-stone-800 dark:text-stone-200">
                    {review.guest.firstName} {review.guest.lastName}
                    <span className="ml-2 font-mono text-[11px] text-stone-400">
                      {format(new Date(review.submittedAt), "d MMM yyyy")}
                    </span>
                  </span>
                  <StarDisplay value={review.driverOverall} />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  {review.trip.destination} · safety {review.driverSafety} · punctuality{" "}
                  {review.driverPunctuality} · professionalism{" "}
                  {review.driverProfessionalism} · communication{" "}
                  {review.driverCommunication}
                  {review.driverKnowledge !== null &&
                    ` · knowledge ${review.driverKnowledge}`}
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
          <EmptyState message="No trips assigned to this driver yet." />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <Th>Safari</Th>
                <Th>Departure</Th>
                <Th>Vehicle</Th>
                <Th>Guests</Th>
                <Th>Distance</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => (
                <tr
                  key={trip.id}
                  className="border-b border-stone-100 dark:border-stone-800/70"
                >
                  <Td>
                    <span className="text-xs">{trip.destination}</span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {format(new Date(trip.scheduledStart), "d MMM yyyy HH:mm")}
                    </span>
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/safari/fleet/vehicles/${trip.vehicleId}`}
                      className="text-xs font-mono hover:text-emerald-600"
                    >
                      {trip.vehicle.plateNumber}
                    </Link>
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
    </div>
  );
}
