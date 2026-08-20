import prisma from "@/core/db/prisma";
import { SafariTripStatus, VehicleStatus } from "@prisma/client";
import { AlertRepository } from "../repositories/alert.repository";
import { DriverRepository } from "../repositories/driver.repository";
import {
  DocumentRepository,
  FuelRepository,
  MaintenanceRepository,
} from "../repositories/ops.repository";
import { ReviewRepository } from "../repositories/review.repository";
import { TripRepository } from "../repositories/trip.repository";
import { VehicleRepository } from "../repositories/vehicle.repository";
import { RatingService, type RatingProfile } from "./rating.service";
import { FuelService } from "./ops.service";
import { calculateOperatingCost, type OperatingCostResult } from "../lib/fuel";
import {
  serviceDueStatus,
  validityStatus,
  type ServiceDueResult,
  type ValidityStatus,
} from "../lib/compliance";
import { MIN_REVIEWS_FOR_INSIGHT, formatRating } from "../lib/rating";

/**
 * Read-side aggregation for the fleet dashboard, vehicle/driver detail pages and
 * the quality-monitoring panel.
 *
 * Everything here is derived from real rows. Where a metric cannot be computed
 * (no fuel logs, no completed trips, too few reviews) the field is null and an
 * accompanying reason string explains why, so the UI never renders a fabricated
 * zero as though it were a measurement.
 */

export interface RankedEntity {
  id: string;
  label: string;
  /** Confidence-adjusted score used for the ordering. */
  bayesian: number | null;
  average: number | null;
  count: number;
}

export interface ServiceDueEntry {
  vehicleId: string;
  label: string;
  currentMileage: number;
  due: ServiceDueResult;
}

export interface DocumentExpiryEntry {
  documentId: string;
  vehicleId: string;
  vehicleLabel: string;
  type: string;
  documentNumber: string;
  expiryDate: Date;
  status: ValidityStatus;
}

export interface FleetDashboardData {
  fleet: {
    total: number;
    byStatus: Record<VehicleStatus, number>;
    archived: number;
  };
  operations: {
    todayTotal: number;
    todayByStatus: Record<SafariTripStatus, number>;
    active: number;
    upcoming: number;
    completedLast30Days: number;
  };
  maintenance: {
    dueSoon: ServiceDueEntry[];
    overdue: ServiceDueEntry[];
    inWorkshop: number;
    /** Vehicles with no service schedule recorded at all. */
    unscheduled: number;
  };
  documents: {
    expired: DocumentExpiryEntry[];
    expiringSoon: DocumentExpiryEntry[];
  };
  ratings: {
    fleetAverage: number | null;
    reviewCount: number;
    topVehicles: RankedEntity[];
    lowVehicles: RankedEntity[];
    topDrivers: RankedEntity[];
    lowDrivers: RankedEntity[];
    /** Explains an empty leaderboard instead of showing an empty box. */
    insufficientDataReason: string;
  };
  costs: OperatingCostResult & {
    currencyCode: string;
    periodDays: number;
    fuelLitres: number;
    fuelRecords: number;
    maintenanceRecords: number;
  };
  alerts: {
    open: number;
    critical: number;
  };
}

const DEFAULT_COST_PERIOD_DAYS = 30;

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function vehicleLabel(vehicle: { plateNumber: string; displayName: string | null }): string {
  return vehicle.displayName
    ? `${vehicle.displayName} (${vehicle.plateNumber})`
    : vehicle.plateNumber;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Orders by the confidence-adjusted score, so a 5.0 from two reviews cannot
 * beat a 4.8 from 150. Entities with too few reviews are excluded entirely
 * rather than ranked on noise.
 */
function rank(
  rows: Array<{ id: string; label: string; ratingCount: number; ratingAvg: unknown; ratingBayesian: unknown }>,
  direction: "top" | "low",
  limit = 5
): RankedEntity[] {
  const eligible = rows
    .filter((r) => r.ratingCount >= MIN_REVIEWS_FOR_INSIGHT)
    .map((r) => ({
      id: r.id,
      label: r.label,
      count: r.ratingCount,
      average: toNumber(r.ratingAvg),
      bayesian: toNumber(r.ratingBayesian),
    }))
    .filter((r) => r.bayesian !== null);

  eligible.sort((a, b) =>
    direction === "top"
      ? (b.bayesian ?? 0) - (a.bayesian ?? 0)
      : (a.bayesian ?? 0) - (b.bayesian ?? 0)
  );

  return eligible.slice(0, limit);
}

export const AnalyticsService = {
  async getFleetDashboard(
    propertyId: string,
    now: Date = new Date()
  ): Promise<FleetDashboardData> {
    const dayStart = startOfUtcDay(now);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);
    const periodStart = new Date(now.getTime() - DEFAULT_COST_PERIOD_DAYS * 24 * 3_600_000);

    const [
      vehicles,
      archivedCount,
      statusCounts,
      todayByStatus,
      activeCount,
      upcomingCount,
      completedLast30,
      latestServices,
      workshopCount,
      documents,
      drivers,
      fleetAverage,
      reviewCount,
      fuelTotals,
      maintenanceTotals,
      distanceAggregate,
      alertCounts,
      property,
    ] = await Promise.all([
      VehicleRepository.list({ propertyId }),
      prisma.vehicle.count({ where: { propertyId, deletedAt: { not: null } } }),
      VehicleRepository.countByStatus(propertyId),
      TripRepository.countByStatus(propertyId, dayStart, dayEnd),
      TripRepository.countActive(propertyId),
      TripRepository.countUpcoming(propertyId, now),
      prisma.safariTrip.count({
        where: {
          propertyId,
          status: SafariTripStatus.COMPLETED,
          scheduledStart: { gte: periodStart },
        },
      }),
      MaintenanceRepository.latestCompletedByVehicle(propertyId),
      prisma.vehicleMaintenance.count({
        where: { vehicle: { propertyId }, status: "IN_PROGRESS" },
      }),
      DocumentRepository.list({ propertyId }),
      DriverRepository.list({ propertyId }),
      ReviewRepository.fleetAverage(propertyId),
      ReviewRepository.countForProperty(propertyId),
      FuelRepository.sumCost(propertyId, periodStart, now),
      MaintenanceRepository.sumCost(propertyId, periodStart, now),
      prisma.safariTrip.aggregate({
        where: {
          propertyId,
          status: SafariTripStatus.COMPLETED,
          scheduledStart: { gte: periodStart },
        },
        _sum: { distanceKm: true },
      }),
      AlertRepository.countOpen(propertyId),
      prisma.property.findUnique({
        where: { id: propertyId },
        select: { baseCurrency: true },
      }),
    ]);

    // --- maintenance buckets
    const serviceByVehicle = new Map<string, (typeof latestServices)[number]>();
    for (const row of latestServices) {
      if (!serviceByVehicle.has(row.vehicleId)) serviceByVehicle.set(row.vehicleId, row);
    }

    const dueSoon: ServiceDueEntry[] = [];
    const overdue: ServiceDueEntry[] = [];
    let unscheduled = 0;

    for (const vehicle of vehicles) {
      if (vehicle.deletedAt !== null) continue;
      const service = serviceByVehicle.get(vehicle.id);
      if (!service) {
        unscheduled += 1;
        continue;
      }
      const due = serviceDueStatus(
        {
          nextServiceDate: service.nextServiceDate,
          nextServiceMileage: service.nextServiceMileage,
          currentMileage: vehicle.currentMileage,
        },
        now
      );
      const entry: ServiceDueEntry = {
        vehicleId: vehicle.id,
        label: vehicleLabel(vehicle),
        currentMileage: vehicle.currentMileage,
        due,
      };
      if (due.status === "OVERDUE") overdue.push(entry);
      else if (due.status === "DUE_SOON") dueSoon.push(entry);
      else if (due.status === "UNKNOWN") unscheduled += 1;
    }

    // --- documents
    const expired: DocumentExpiryEntry[] = [];
    const expiringSoon: DocumentExpiryEntry[] = [];
    for (const doc of documents) {
      const status = validityStatus(doc.expiryDate, undefined, now);
      if (status === "VALID") continue;
      const entry: DocumentExpiryEntry = {
        documentId: doc.id,
        vehicleId: doc.vehicleId,
        vehicleLabel: vehicleLabel(doc.vehicle),
        type: doc.type,
        documentNumber: doc.documentNumber,
        expiryDate: doc.expiryDate,
        status,
      };
      if (status === "EXPIRED") expired.push(entry);
      else expiringSoon.push(entry);
    }

    // --- rating leaderboards
    const vehicleRows = vehicles
      .filter((v) => v.deletedAt === null)
      .map((v) => ({
        id: v.id,
        label: vehicleLabel(v),
        ratingCount: v.ratingCount,
        ratingAvg: v.ratingAvg,
        ratingBayesian: v.ratingBayesian,
      }));
    const driverRows = drivers
      .filter((d) => d.deletedAt === null)
      .map((d) => ({
        id: d.id,
        label: `${d.employee.firstName} ${d.employee.lastName}`,
        ratingCount: d.ratingCount,
        ratingAvg: d.ratingAvg,
        ratingBayesian: d.ratingBayesian,
      }));

    const topVehicles = rank(vehicleRows, "top");
    const topDrivers = rank(driverRows, "top");
    const insufficientDataReason =
      topVehicles.length === 0 && topDrivers.length === 0
        ? `No vehicle or driver has reached ${MIN_REVIEWS_FOR_INSIGHT} reviews yet, so rankings are not shown.`
        : "";

    // --- costs
    const distanceKm = distanceAggregate._sum.distanceKm ?? 0;
    const operating = calculateOperatingCost(
      fuelTotals.total,
      maintenanceTotals.total,
      distanceKm
    );

    return {
      fleet: {
        total: vehicles.filter((v) => v.deletedAt === null).length,
        byStatus: statusCounts,
        archived: archivedCount,
      },
      operations: {
        todayTotal: Object.values(todayByStatus).reduce((a, b) => a + b, 0),
        todayByStatus,
        active: activeCount,
        upcoming: upcomingCount,
        completedLast30Days: completedLast30,
      },
      maintenance: {
        dueSoon,
        overdue,
        inWorkshop: workshopCount,
        unscheduled,
      },
      documents: { expired, expiringSoon },
      ratings: {
        fleetAverage,
        reviewCount,
        topVehicles,
        lowVehicles: rank(vehicleRows, "low"),
        topDrivers,
        lowDrivers: rank(driverRows, "low"),
        insufficientDataReason,
      },
      costs: {
        ...operating,
        currencyCode: property?.baseCurrency ?? "USD",
        periodDays: DEFAULT_COST_PERIOD_DAYS,
        fuelLitres: fuelTotals.litres,
        fuelRecords: fuelTotals.count,
        maintenanceRecords: maintenanceTotals.count,
      },
      alerts: { open: alertCounts.total, critical: alertCounts.critical },
    };
  },

  /** Per-vehicle analytics for the vehicle detail page. */
  async getVehicleAnalytics(vehicleId: string, now: Date = new Date()) {
    const periodStart = new Date(now.getTime() - 180 * 24 * 3_600_000);

    const vehicle = await VehicleRepository.findById(vehicleId);
    if (!vehicle) return null;

    const [efficiency, costTrend, ratingProfile, fuelTotals, maintenanceTotals, distance, latestService] =
      await Promise.all([
        FuelService.efficiencyForVehicle(vehicleId),
        FuelService.costTrendForVehicle(vehicleId, periodStart, now),
        RatingService.getVehicleRatingProfile(vehicleId),
        FuelRepository.sumCost(vehicle.propertyId, periodStart, now, vehicleId),
        MaintenanceRepository.sumCost(vehicle.propertyId, periodStart, now, vehicleId),
        prisma.safariTrip.aggregate({
          where: {
            vehicleId,
            status: SafariTripStatus.COMPLETED,
            scheduledStart: { gte: periodStart },
          },
          _sum: { distanceKm: true },
          _count: { _all: true },
        }),
        prisma.vehicleMaintenance.findFirst({
          where: {
            vehicleId,
            status: "COMPLETED",
            OR: [{ nextServiceDate: { not: null } }, { nextServiceMileage: { not: null } }],
          },
          select: { nextServiceDate: true, nextServiceMileage: true, serviceDate: true },
          orderBy: { serviceDate: "desc" },
        }),
      ]);

    return {
      vehicle,
      efficiency,
      costTrend,
      ratingProfile,
      operating: calculateOperatingCost(
        fuelTotals.total,
        maintenanceTotals.total,
        distance._sum.distanceKm ?? 0
      ),
      completedTrips: distance._count._all,
      serviceDue: serviceDueStatus(
        {
          nextServiceDate: latestService?.nextServiceDate ?? null,
          nextServiceMileage: latestService?.nextServiceMileage ?? null,
          currentMileage: vehicle.currentMileage,
        },
        now
      ),
      periodDays: 180,
    };
  },

  /**
   * Quality-monitoring narrative for the dashboard.
   *
   * Each line is generated only when the underlying sample supports it — no
   * insight is produced from fewer than MIN_REVIEWS_FOR_INSIGHT reviews, and
   * cost observations require both cost and distance data.
   */
  async getQualityInsights(propertyId: string, now: Date = new Date()): Promise<string[]> {
    const insights: string[] = [];
    const periodStart = new Date(now.getTime() - 180 * 24 * 3_600_000);

    const [vehicles, drivers] = await Promise.all([
      VehicleRepository.list({ propertyId }),
      DriverRepository.list({ propertyId }),
    ]);

    const activeVehicles = vehicles.filter(
      (v) => v.deletedAt === null && v.ratingCount >= MIN_REVIEWS_FOR_INSIGHT
    );
    const activeDrivers = drivers.filter(
      (d) => d.deletedAt === null && d.ratingCount >= MIN_REVIEWS_FOR_INSIGHT
    );

    for (const vehicle of activeVehicles) {
      const profile = await RatingService.getVehicleRatingProfile(vehicle.id);
      insights.push(...describeProfile(vehicleLabel(vehicle), profile));

      if (profile.trend.direction === "DECLINING" || profile.isLowRated) {
        // Only pull cost figures for vehicles already flagged on quality: the
        // interesting story is "expensive AND getting worse".
        const [maintenanceTotals, distance] = await Promise.all([
          MaintenanceRepository.sumCost(propertyId, periodStart, now, vehicle.id),
          prisma.safariTrip.aggregate({
            where: {
              vehicleId: vehicle.id,
              status: SafariTripStatus.COMPLETED,
              scheduledStart: { gte: periodStart },
            },
            _sum: { distanceKm: true },
          }),
        ]);
        const km = distance._sum.distanceKm ?? 0;
        if (maintenanceTotals.count > 0 && km > 0) {
          const perKm = maintenanceTotals.total / km;
          insights.push(
            `${vehicleLabel(vehicle)} has spent ${maintenanceTotals.total.toFixed(2)} on maintenance across ${km} km (${perKm.toFixed(3)} per km) in the last 180 days while its guest ratings are ${profile.isLowRated ? "low" : "declining"}.`
          );
        }
      }
    }

    for (const driver of activeDrivers) {
      const profile = await RatingService.getDriverRatingProfile(driver.id);
      insights.push(
        ...describeProfile(`${driver.employee.firstName} ${driver.employee.lastName}`, profile)
      );
    }

    return insights;
  },
};

/** Turns a rating profile into the plain-language observations the brief asks for. */
function describeProfile(label: string, profile: RatingProfile): string[] {
  const lines: string[] = [];
  if (!profile.hasEnoughData) return lines;

  if (profile.trend.isSuddenDrop) {
    lines.push(
      `${label} rating dropped from ${formatRating(profile.trend.previousAverage)} to ${formatRating(profile.trend.recentAverage)} over the last ${profile.trend.windowSize} reviews.`
    );
  } else if (profile.trend.direction === "DECLINING") {
    lines.push(
      `${label} is trending down: ${formatRating(profile.trend.previousAverage)} to ${formatRating(profile.trend.recentAverage)} across the last ${profile.trend.windowSize} reviews.`
    );
  } else if (profile.trend.direction === "IMPROVING") {
    lines.push(
      `${label} is improving: ${formatRating(profile.trend.previousAverage)} to ${formatRating(profile.trend.recentAverage)} across the last ${profile.trend.windowSize} reviews.`
    );
  }

  for (const weakness of profile.weaknesses.slice(0, 2)) {
    lines.push(
      `${label} scores consistently low on ${weakness.category.toLowerCase()} (${formatRating(weakness.average)} against an overall ${formatRating(profile.overallAverage)}) across ${profile.count} reviews.`
    );
  }

  if (profile.isLowRated) {
    lines.push(
      `${label} has a confidence-adjusted score of ${formatRating(profile.bayesian)} from ${profile.count} reviews, below the ${formatRating(3.5)} review threshold.`
    );
  }

  return lines;
}
