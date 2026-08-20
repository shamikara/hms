import prisma from "@/core/db/prisma";
import {
  FleetAlertSeverity,
  FleetAlertStatus,
  FleetAlertType,
  MaintenanceStatus,
} from "@prisma/client";
import { Logger } from "@/core/logging/Logger";
import { AlertRepository, type AlertRow } from "../repositories/alert.repository";
import { DocumentRepository, MaintenanceRepository } from "../repositories/ops.repository";
import { DriverRepository } from "../repositories/driver.repository";
import { VehicleRepository } from "../repositories/vehicle.repository";
import { RatingService } from "./rating.service";
import {
  DOCUMENT_EXPIRY_WARNING_DAYS,
  LICENSE_EXPIRY_WARNING_DAYS,
  daysUntil,
  serviceDueStatus,
  validityStatus,
} from "../lib/compliance";
import { formatRating } from "../lib/rating";

/**
 * Fleet alerting.
 *
 * Anti-spam design (the brief calls this out explicitly):
 *   - every alert has a `dedupeKey` that encodes *entity + type + threshold
 *     bucket*, and the key is uniquely indexed. Running the sweep a hundred
 *     times produces the same rows, with refreshed wording;
 *   - the key changes only when the situation meaningfully changes
 *     (EXPIRING_SOON -> EXPIRED, DUE_SOON -> OVERDUE), which is exactly when a
 *     human should be told again;
 *   - keys the sweep no longer produces are auto-resolved, so a fixed problem
 *     disappears instead of nagging;
 *   - an acknowledged alert is not reopened unless its severity escalates.
 *
 * The sweep is idempotent and cheap enough to run on dashboard load, throttled
 * by a `Setting` row (see {@link SWEEP_THROTTLE_MINUTES}).
 */

const logger = new Logger("FleetAlertService");

/** Minimum gap between automatic sweeps for one property. */
export const SWEEP_THROTTLE_MINUTES = 15;

const SWEEP_SETTING_KEY = "fleet.alerts.lastSweptAt";

const MAINTENANCE_ALERT_TYPES: FleetAlertType[] = [
  FleetAlertType.SERVICE_DUE_DATE,
  FleetAlertType.SERVICE_DUE_MILEAGE,
  FleetAlertType.MAINTENANCE_OVERDUE,
];

const DOCUMENT_ALERT_TYPES: FleetAlertType[] = [
  FleetAlertType.DOCUMENT_EXPIRING,
  FleetAlertType.DOCUMENT_EXPIRED,
];

const LICENSE_ALERT_TYPES: FleetAlertType[] = [
  FleetAlertType.LICENSE_EXPIRING,
  FleetAlertType.LICENSE_EXPIRED,
];

export interface SweepResult {
  ran: boolean;
  raised: number;
  resolved: number;
  skippedReason: string;
}

function vehicleLabel(vehicle: { plateNumber: string; displayName: string | null }): string {
  return vehicle.displayName ? `${vehicle.displayName} (${vehicle.plateNumber})` : vehicle.plateNumber;
}

function humanise(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

export const AlertService = {
  async list(propertyId: string, take = 50): Promise<AlertRow[]> {
    return AlertRepository.list({
      propertyId,
      statuses: [FleetAlertStatus.OPEN, FleetAlertStatus.ACKNOWLEDGED],
      take,
    });
  },

  async setStatus(id: string, resolve: boolean): Promise<AlertRow> {
    return AlertRepository.setStatus(
      id,
      resolve ? FleetAlertStatus.RESOLVED : FleetAlertStatus.ACKNOWLEDGED
    );
  },

  /**
   * Recomputes every compliance/maintenance/rating alert for a property.
   * Safe to call repeatedly — see the anti-spam notes in the file header.
   */
  async sweep(propertyId: string, now: Date = new Date()): Promise<SweepResult> {
    let raised = 0;
    let resolved = 0;

    const [vehicles, drivers, documents, latestServices] = await Promise.all([
      VehicleRepository.list({ propertyId }),
      DriverRepository.list({ propertyId }),
      DocumentRepository.list({ propertyId }),
      MaintenanceRepository.latestCompletedByVehicle(propertyId),
    ]);

    // --- Maintenance: due soon / overdue -------------------------------------
    // `latestCompletedByVehicle` is ordered newest-first, so the first row seen
    // for a vehicle carries its current service targets.
    const serviceByVehicle = new Map<string, (typeof latestServices)[number]>();
    for (const row of latestServices) {
      if (!serviceByVehicle.has(row.vehicleId)) serviceByVehicle.set(row.vehicleId, row);
    }

    const maintenanceKeys: string[] = [];
    for (const vehicle of vehicles) {
      if (vehicle.deletedAt !== null) continue;
      const service = serviceByVehicle.get(vehicle.id);
      if (!service) continue;

      const due = serviceDueStatus(
        {
          nextServiceDate: service.nextServiceDate,
          nextServiceMileage: service.nextServiceMileage,
          currentMileage: vehicle.currentMileage,
        },
        now
      );

      if (due.status !== "DUE_SOON" && due.status !== "OVERDUE") continue;

      const byMileage =
        due.kmRemaining !== null &&
        (due.daysRemaining === null || due.kmRemaining < 0 || due.status === "DUE_SOON");

      const type =
        due.status === "OVERDUE"
          ? FleetAlertType.MAINTENANCE_OVERDUE
          : byMileage
            ? FleetAlertType.SERVICE_DUE_MILEAGE
            : FleetAlertType.SERVICE_DUE_DATE;

      const dedupeKey = `service:${vehicle.id}:${due.status}`;
      maintenanceKeys.push(dedupeKey);

      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type,
        severity:
          due.status === "OVERDUE" ? FleetAlertSeverity.CRITICAL : FleetAlertSeverity.WARNING,
        title:
          due.status === "OVERDUE"
            ? `Service overdue: ${vehicleLabel(vehicle)}`
            : `Service due: ${vehicleLabel(vehicle)}`,
        message: due.reason,
        dedupeKey,
        vehicleId: vehicle.id,
      });
      raised += 1;
    }

    // Also flag jobs left sitting in the workshop past their service date.
    const stalledJobs = await MaintenanceRepository.list({
      propertyId,
      status: MaintenanceStatus.IN_PROGRESS,
      take: 200,
    });
    for (const job of stalledJobs) {
      const overdueDays = -daysUntil(job.serviceDate, now);
      if (overdueDays < 3) continue;
      const dedupeKey = `workshop:${job.id}`;
      maintenanceKeys.push(dedupeKey);
      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type: FleetAlertType.MAINTENANCE_OVERDUE,
        severity: FleetAlertSeverity.WARNING,
        title: `Workshop job open ${overdueDays} days: ${vehicleLabel(job.vehicle)}`,
        message: `${humanise(job.type)} — "${job.description}" has been in progress since ${job.serviceDate.toISOString().slice(0, 10)}.`,
        dedupeKey,
        vehicleId: job.vehicleId,
      });
      raised += 1;
    }

    resolved += await AlertRepository.resolveStale(
      propertyId,
      MAINTENANCE_ALERT_TYPES,
      maintenanceKeys
    );

    // --- Documents -----------------------------------------------------------
    const documentKeys: string[] = [];
    for (const doc of documents) {
      const status = validityStatus(doc.expiryDate, DOCUMENT_EXPIRY_WARNING_DAYS, now);
      if (status === "VALID") continue;

      const dedupeKey = `doc:${doc.id}:${status}`;
      documentKeys.push(dedupeKey);
      const days = daysUntil(doc.expiryDate, now);

      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type:
          status === "EXPIRED"
            ? FleetAlertType.DOCUMENT_EXPIRED
            : FleetAlertType.DOCUMENT_EXPIRING,
        severity:
          status === "EXPIRED" ? FleetAlertSeverity.CRITICAL : FleetAlertSeverity.WARNING,
        title:
          status === "EXPIRED"
            ? `Expired ${humanise(doc.type)}: ${vehicleLabel(doc.vehicle)}`
            : `${humanise(doc.type)} expires in ${days} day(s): ${vehicleLabel(doc.vehicle)}`,
        message: `Document ${doc.documentNumber} expires ${doc.expiryDate.toISOString().slice(0, 10)}.`,
        dedupeKey,
        vehicleId: doc.vehicleId,
      });
      raised += 1;
    }
    resolved += await AlertRepository.resolveStale(
      propertyId,
      DOCUMENT_ALERT_TYPES,
      documentKeys
    );

    // --- Driver licences -----------------------------------------------------
    const licenseKeys: string[] = [];
    for (const driver of drivers) {
      if (driver.deletedAt !== null) continue;
      const status = validityStatus(driver.licenseExpiry, LICENSE_EXPIRY_WARNING_DAYS, now);
      if (status === "VALID") continue;

      const dedupeKey = `license:${driver.id}:${status}`;
      licenseKeys.push(dedupeKey);
      const name = `${driver.employee.firstName} ${driver.employee.lastName}`;
      const days = daysUntil(driver.licenseExpiry, now);

      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type:
          status === "EXPIRED"
            ? FleetAlertType.LICENSE_EXPIRED
            : FleetAlertType.LICENSE_EXPIRING,
        severity:
          status === "EXPIRED" ? FleetAlertSeverity.CRITICAL : FleetAlertSeverity.WARNING,
        title:
          status === "EXPIRED"
            ? `Driving licence expired: ${name}`
            : `Driving licence expires in ${days} day(s): ${name}`,
        message: `Licence ${driver.licenseNumber} expires ${driver.licenseExpiry.toISOString().slice(0, 10)}.`,
        dedupeKey,
        driverId: driver.id,
      });
      raised += 1;
    }
    resolved += await AlertRepository.resolveStale(
      propertyId,
      LICENSE_ALERT_TYPES,
      licenseKeys
    );

    // --- Ratings -------------------------------------------------------------
    const ratingKeys: string[] = [];
    for (const vehicle of vehicles) {
      if (vehicle.deletedAt !== null) continue;
      const keys = await this.upsertVehicleRatingAlerts(propertyId, vehicle.id, vehicleLabel(vehicle));
      ratingKeys.push(...keys);
      raised += keys.length;
    }
    for (const driver of drivers) {
      if (driver.deletedAt !== null) continue;
      const name = `${driver.employee.firstName} ${driver.employee.lastName}`;
      const keys = await this.upsertDriverRatingAlerts(propertyId, driver.id, name);
      ratingKeys.push(...keys);
      raised += keys.length;
    }
    resolved += await AlertRepository.resolveStale(
      propertyId,
      [FleetAlertType.LOW_RATING, FleetAlertType.RATING_DECLINE],
      ratingKeys
    );

    return { ran: true, raised, resolved, skippedReason: "" };
  },

  /**
   * Runs {@link sweep} at most once every {@link SWEEP_THROTTLE_MINUTES} per
   * property. The timestamp lives in the existing `Setting` key-value store, so
   * this needs no new infrastructure and survives a redeploy.
   */
  async sweepThrottled(propertyId: string, now: Date = new Date()): Promise<SweepResult> {
    const setting = await prisma.setting.findUnique({
      where: { propertyId_key: { propertyId, key: SWEEP_SETTING_KEY } },
      select: { id: true, value: true },
    });

    const lastSwept =
      setting && typeof setting.value === "string" ? new Date(setting.value) : null;

    if (
      lastSwept !== null &&
      Number.isFinite(lastSwept.getTime()) &&
      now.getTime() - lastSwept.getTime() < SWEEP_THROTTLE_MINUTES * 60_000
    ) {
      return {
        ran: false,
        raised: 0,
        resolved: 0,
        skippedReason: `Last swept ${lastSwept.toISOString()}`,
      };
    }

    const result = await this.sweep(propertyId, now);

    await prisma.setting.upsert({
      where: { propertyId_key: { propertyId, key: SWEEP_SETTING_KEY } },
      create: {
        level: "PROPERTY",
        propertyId,
        key: SWEEP_SETTING_KEY,
        value: now.toISOString(),
      },
      update: { value: now.toISOString() },
    });

    return result;
  },

  /**
   * Targeted rating-alert refresh after a single review lands, so a bad review
   * shows up on the dashboard immediately rather than at the next sweep.
   *
   * The driver alert is filed against the vehicle's property: both were on the
   * same trip, and a driver can be assigned to more than one property.
   */
  async evaluateRatingAlerts(vehicleId: string, driverId: string): Promise<void> {
    const vehicle = await VehicleRepository.findById(vehicleId);
    if (!vehicle) return;

    const driver = await DriverRepository.findById(driverId);

    const liveKeys: string[] = [];
    liveKeys.push(
      ...(await this.upsertVehicleRatingAlerts(
        vehicle.propertyId,
        vehicle.id,
        vehicleLabel(vehicle)
      ))
    );
    if (driver) {
      liveKeys.push(
        ...(await this.upsertDriverRatingAlerts(
          vehicle.propertyId,
          driver.id,
          `${driver.employee.firstName} ${driver.employee.lastName}`
        ))
      );
    }

    // Resolve only this vehicle's / driver's own stale rating alerts; a
    // property-wide resolve here would close alerts for entities we did not look at.
    const ownKeys = [
      `lowrating:vehicle:${vehicleId}`,
      `decline:vehicle:${vehicleId}`,
      `lowrating:driver:${driverId}`,
      `decline:driver:${driverId}`,
    ].filter((key) => !liveKeys.includes(key));

    if (ownKeys.length > 0) {
      const count = await AlertRepository.resolveByDedupeKeys(ownKeys);
      if (count > 0) {
        logger.info("Resolved rating alerts that no longer apply", { count });
      }
    }
  },

  /** Returns the dedupe keys it raised, for the caller's stale-resolution pass. */
  async upsertVehicleRatingAlerts(
    propertyId: string,
    vehicleId: string,
    label: string
  ): Promise<string[]> {
    const profile = await RatingService.getVehicleRatingProfile(vehicleId);
    const keys: string[] = [];

    if (profile.isLowRated) {
      const key = `lowrating:vehicle:${vehicleId}`;
      keys.push(key);
      const weakest = profile.weaknesses[0];
      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type: FleetAlertType.LOW_RATING,
        severity: FleetAlertSeverity.WARNING,
        title: `Low guest rating: ${label}`,
        message:
          `Confidence-adjusted score ${formatRating(profile.bayesian)} from ${profile.count} reviews` +
          (weakest ? `. Weakest area: ${weakest.category} (${formatRating(weakest.average)}).` : "."),
        dedupeKey: key,
        vehicleId,
      });
    }

    if (profile.trend.isSuddenDrop) {
      const key = `decline:vehicle:${vehicleId}`;
      keys.push(key);
      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type: FleetAlertType.RATING_DECLINE,
        severity: FleetAlertSeverity.WARNING,
        title: `Rating dropping: ${label}`,
        message: `Rating fell from ${formatRating(profile.trend.previousAverage)} to ${formatRating(profile.trend.recentAverage)} over the last ${profile.trend.windowSize} reviews.`,
        dedupeKey: key,
        vehicleId,
      });
    }

    return keys;
  },

  async upsertDriverRatingAlerts(
    propertyId: string,
    driverId: string,
    name: string
  ): Promise<string[]> {
    const profile = await RatingService.getDriverRatingProfile(driverId);
    const keys: string[] = [];

    if (profile.isLowRated) {
      const key = `lowrating:driver:${driverId}`;
      keys.push(key);
      const weakest = profile.weaknesses[0];
      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type: FleetAlertType.LOW_RATING,
        severity: FleetAlertSeverity.WARNING,
        title: `Low guest rating: ${name}`,
        message:
          `Confidence-adjusted score ${formatRating(profile.bayesian)} from ${profile.count} reviews` +
          (weakest ? `. Consistently weak on ${weakest.category} (${formatRating(weakest.average)}).` : "."),
        dedupeKey: key,
        driverId,
      });
    }

    if (profile.trend.isSuddenDrop) {
      const key = `decline:driver:${driverId}`;
      keys.push(key);
      await AlertRepository.upsertByDedupeKey({
        propertyId,
        type: FleetAlertType.RATING_DECLINE,
        severity: FleetAlertSeverity.WARNING,
        title: `Rating dropping: ${name}`,
        message: `Rating fell from ${formatRating(profile.trend.previousAverage)} to ${formatRating(profile.trend.recentAverage)} over the last ${profile.trend.windowSize} reviews.`,
        dedupeKey: key,
        driverId,
      });
    }

    return keys;
  },
};
