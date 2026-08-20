import prisma from "@/core/db/prisma";
import {
  DriverEmploymentStatus,
  MaintenanceStatus,
  SafariTripStatus,
  VehicleDocumentType,
  VehicleStatus,
} from "@prisma/client";
import { DriverRepository, type DriverRow } from "../repositories/driver.repository";
import { DocumentRepository, MaintenanceRepository } from "../repositories/ops.repository";
import { TripRepository } from "../repositories/trip.repository";
import { VehicleRepository, type FleetTx, type VehicleRow } from "../repositories/vehicle.repository";

/**
 * Availability and conflict prevention.
 *
 * Design rule from the brief: availability is *computed from actual trip dates
 * and times*, never read off the manually-editable `Vehicle.status` column.
 * The status column is an operational display of "what is this vehicle doing
 * right now", and it is derived (see {@link deriveVehicleStatus}) rather than
 * being the source of truth for booking decisions.
 *
 * A vehicle is blocked for a window when any of these hold:
 *   1. an overlapping `SafariTrip` in a non-cancelled status;
 *   2. an overlapping legacy `SafariSchedule` that was never dispatched as a trip;
 *   3. maintenance in progress, or a service booked inside the window;
 *   4. it is archived / inactive / grounded (OUT_OF_SERVICE, RETIRED, MAINTENANCE);
 *   5. an expired insurance or revenue licence on record;
 *   6. insufficient capacity for the party size.
 *
 * A driver is blocked when:
 *   1. an overlapping trip, or an overlapping legacy schedule as driver;
 *   2. employment status is not ACTIVE, or the roster flag is off;
 *   3. archived / inactive;
 *   4. the driving licence expires before the trip ends.
 */

/** Documents whose expiry legally grounds a vehicle. */
const GROUNDING_DOCUMENT_TYPES: VehicleDocumentType[] = [
  VehicleDocumentType.INSURANCE,
  VehicleDocumentType.REVENUE_LICENSE,
];

/** Statuses that mean "not usable for a new assignment, whatever the diary says". */
const UNUSABLE_VEHICLE_STATUSES: VehicleStatus[] = [
  VehicleStatus.MAINTENANCE,
  VehicleStatus.OUT_OF_SERVICE,
  VehicleStatus.RETIRED,
];

/**
 * How far ahead of departure a vehicle is shown as RESERVED rather than
 * AVAILABLE. Purely cosmetic — it does not affect conflict checks.
 */
export const RESERVATION_LEAD_HOURS = 6;

export type ConflictKind =
  | "VEHICLE_TRIP"
  | "VEHICLE_SCHEDULE"
  | "VEHICLE_MAINTENANCE"
  | "VEHICLE_STATUS"
  | "VEHICLE_DOCUMENT"
  | "VEHICLE_CAPACITY"
  | "DRIVER_TRIP"
  | "DRIVER_SCHEDULE"
  | "DRIVER_STATUS"
  | "DRIVER_LICENSE"
  | "GUIDE_TRIP"
  | "GUIDE_SCHEDULE";

export interface AssignmentConflict {
  kind: ConflictKind;
  /** Id of the vehicle / driver / guide the conflict is about. */
  subjectId: string;
  message: string;
  conflictingTripId?: string;
  conflictingScheduleId?: string;
}

export interface AssignmentCheckInput {
  start: Date;
  end: Date;
  guestCount: number;
  vehicleId?: string;
  /** `SafariDriver` id. */
  driverId?: string;
  /** `Employee` id acting as guide. */
  guideId?: string;
  /** Ignore this trip when checking (used when editing it). */
  excludeTripId?: string;
}

export interface VehicleAvailability {
  vehicle: VehicleRow;
  isAvailable: boolean;
  /** Guests this vehicle can carry on safari. */
  effectiveCapacity: number;
  /** Reasons the vehicle cannot be used. Empty when available. */
  blockers: string[];
  /** Non-blocking notes (e.g. a certificate expiring next week). */
  warnings: string[];
}

export interface DriverAvailability {
  driver: DriverRow;
  isAvailable: boolean;
  blockers: string[];
  warnings: string[];
}

export function effectiveSafariCapacity(vehicle: {
  capacity: number;
  safariCapacity: number | null;
}): number {
  return vehicle.safariCapacity ?? vehicle.capacity;
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

function timeRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toISOString().replace("T", " ").slice(0, 16).concat(" UTC");
  return `${fmt(start)} – ${fmt(end)}`;
}

export const AvailabilityService = {
  /**
   * The authoritative conflict check. Called from the UI to preview conflicts
   * and again inside the assignment transaction, so a stale preview can never
   * be committed.
   */
  async checkAssignment(
    input: AssignmentCheckInput,
    tx?: FleetTx
  ): Promise<AssignmentConflict[]> {
    const client = tx ?? prisma;
    const conflicts: AssignmentConflict[] = [];

    const vehicleIds = input.vehicleId ? [input.vehicleId] : [];
    const driverIds = input.driverId ? [input.driverId] : [];
    const guideIds = input.guideId ? [input.guideId] : [];

    // --- Resolve the subjects up front; we need them for both the diary checks
    //     and the eligibility checks.
    const [vehicle, driver] = await Promise.all([
      input.vehicleId
        ? client.vehicle.findUnique({
            where: { id: input.vehicleId },
            select: {
              id: true,
              plateNumber: true,
              capacity: true,
              safariCapacity: true,
              status: true,
              isActive: true,
              deletedAt: true,
            },
          })
        : Promise.resolve(null),
      input.driverId
        ? client.safariDriver.findUnique({
            where: { id: input.driverId },
            select: {
              id: true,
              employeeId: true,
              licenseExpiry: true,
              employmentStatus: true,
              isAvailable: true,
              isActive: true,
              deletedAt: true,
              employee: { select: { firstName: true, lastName: true } },
            },
          })
        : Promise.resolve(null),
    ]);

    if (input.vehicleId && !vehicle) {
      conflicts.push({
        kind: "VEHICLE_STATUS",
        subjectId: input.vehicleId,
        message: "The selected vehicle no longer exists.",
      });
    }
    if (input.driverId && !driver) {
      conflicts.push({
        kind: "DRIVER_STATUS",
        subjectId: input.driverId,
        message: "The selected driver no longer exists.",
      });
    }

    // --- 1 & 2: diary conflicts, across both the new and the legacy tables.
    const [trips, schedules] = await Promise.all([
      TripRepository.findConflictingTrips(
        {
          start: input.start,
          end: input.end,
          vehicleIds,
          driverIds,
          guideIds,
          excludeTripId: input.excludeTripId,
        },
        tx
      ),
      TripRepository.findConflictingSchedules(
        {
          start: input.start,
          end: input.end,
          vehicleIds,
          driverEmployeeIds: driver ? [driver.employeeId] : [],
          guideIds,
        },
        tx
      ),
    ]);

    for (const trip of trips) {
      if (input.vehicleId && trip.vehicleId === input.vehicleId) {
        conflicts.push({
          kind: "VEHICLE_TRIP",
          subjectId: input.vehicleId,
          conflictingTripId: trip.id,
          message: `Vehicle ${trip.vehicle.plateNumber} is already on "${trip.destination}" (${timeRange(trip.scheduledStart, trip.scheduledEnd)}).`,
        });
      }
      if (input.driverId && trip.driverId === input.driverId) {
        conflicts.push({
          kind: "DRIVER_TRIP",
          subjectId: input.driverId,
          conflictingTripId: trip.id,
          message: `Driver ${fullName(trip.driver.employee)} is already assigned to "${trip.destination}" (${timeRange(trip.scheduledStart, trip.scheduledEnd)}).`,
        });
      }
      if (input.guideId && trip.guideId === input.guideId && trip.guide) {
        conflicts.push({
          kind: "GUIDE_TRIP",
          subjectId: input.guideId,
          conflictingTripId: trip.id,
          message: `Guide ${fullName(trip.guide)} is already assigned to "${trip.destination}" (${timeRange(trip.scheduledStart, trip.scheduledEnd)}).`,
        });
      }
    }

    for (const schedule of schedules) {
      if (input.vehicleId && schedule.vehicleId === input.vehicleId) {
        conflicts.push({
          kind: "VEHICLE_SCHEDULE",
          subjectId: input.vehicleId,
          conflictingScheduleId: schedule.id,
          message: `Vehicle ${schedule.vehicle.plateNumber} is booked on the game drive schedule "${schedule.route.name}" (${timeRange(schedule.startTime, schedule.endTime)}).`,
        });
      }
      if (driver && schedule.driverId === driver.employeeId) {
        conflicts.push({
          kind: "DRIVER_SCHEDULE",
          subjectId: driver.id,
          conflictingScheduleId: schedule.id,
          message: `Driver ${fullName(driver.employee)} is booked on the game drive schedule "${schedule.route.name}" (${timeRange(schedule.startTime, schedule.endTime)}).`,
        });
      }
      if (input.guideId && schedule.guideId === input.guideId) {
        conflicts.push({
          kind: "GUIDE_SCHEDULE",
          subjectId: input.guideId,
          conflictingScheduleId: schedule.id,
          message: `Guide ${fullName(schedule.guide)} is booked on the game drive schedule "${schedule.route.name}" (${timeRange(schedule.startTime, schedule.endTime)}).`,
        });
      }
    }

    // --- 3, 4, 5, 6: vehicle eligibility.
    if (vehicle) {
      if (vehicle.deletedAt !== null || !vehicle.isActive) {
        conflicts.push({
          kind: "VEHICLE_STATUS",
          subjectId: vehicle.id,
          message: `Vehicle ${vehicle.plateNumber} is archived or inactive.`,
        });
      }

      if (UNUSABLE_VEHICLE_STATUSES.includes(vehicle.status)) {
        conflicts.push({
          kind: "VEHICLE_STATUS",
          subjectId: vehicle.id,
          message: `Vehicle ${vehicle.plateNumber} is marked ${vehicle.status.replace(/_/g, " ").toLowerCase()}.`,
        });
      }

      const blocks = await TripRepository.findMaintenanceBlocks(
        [vehicle.id],
        input.start,
        input.end,
        tx
      );
      for (const block of blocks) {
        conflicts.push({
          kind: "VEHICLE_MAINTENANCE",
          subjectId: vehicle.id,
          message:
            block.status === MaintenanceStatus.IN_PROGRESS
              ? `Vehicle ${vehicle.plateNumber} is in the workshop (${block.description}).`
              : `Vehicle ${vehicle.plateNumber} has ${block.type.replace(/_/g, " ").toLowerCase()} booked inside this window.`,
        });
      }

      const expiredDocs = await DocumentRepository.findExpired(
        [vehicle.id],
        input.end,
        tx
      );
      for (const doc of expiredDocs) {
        if (GROUNDING_DOCUMENT_TYPES.includes(doc.type)) {
          conflicts.push({
            kind: "VEHICLE_DOCUMENT",
            subjectId: vehicle.id,
            message: `Vehicle ${vehicle.plateNumber} has an expired ${doc.type.replace(/_/g, " ").toLowerCase()} (${doc.documentNumber}).`,
          });
        }
      }

      const capacity = effectiveSafariCapacity(vehicle);
      if (input.guestCount > capacity) {
        conflicts.push({
          kind: "VEHICLE_CAPACITY",
          subjectId: vehicle.id,
          message: `Vehicle ${vehicle.plateNumber} seats ${capacity} on safari but ${input.guestCount} guests are booked.`,
        });
      }
    }

    // --- driver eligibility.
    if (driver) {
      const name = fullName(driver.employee);
      if (driver.deletedAt !== null || !driver.isActive) {
        conflicts.push({
          kind: "DRIVER_STATUS",
          subjectId: driver.id,
          message: `${name} is archived or inactive.`,
        });
      }
      if (driver.employmentStatus !== DriverEmploymentStatus.ACTIVE) {
        conflicts.push({
          kind: "DRIVER_STATUS",
          subjectId: driver.id,
          message: `${name} is ${driver.employmentStatus.replace(/_/g, " ").toLowerCase()}.`,
        });
      }
      if (!driver.isAvailable) {
        conflicts.push({
          kind: "DRIVER_STATUS",
          subjectId: driver.id,
          message: `${name} is marked unavailable on the roster.`,
        });
      }
      if (driver.licenseExpiry.getTime() < input.end.getTime()) {
        conflicts.push({
          kind: "DRIVER_LICENSE",
          subjectId: driver.id,
          message: `${name}'s driving licence expires on ${driver.licenseExpiry.toISOString().slice(0, 10)}, before this trip ends.`,
        });
      }
    }

    return conflicts;
  },

  /**
   * Every vehicle at the property annotated with whether it can take the job.
   * Unavailable vehicles are returned too (with reasons) so a dispatcher can
   * see *why* the fleet is tight rather than staring at an empty list.
   */
  async listVehicleAvailability(query: {
    propertyId: string;
    start: Date;
    end: Date;
    guestCount: number;
    excludeTripId?: string;
  }): Promise<VehicleAvailability[]> {
    const vehicles = await VehicleRepository.list({ propertyId: query.propertyId });
    const vehicleIds = vehicles.map((v) => v.id);
    if (vehicleIds.length === 0) return [];

    const [trips, schedules, maintenance, expiredDocs] = await Promise.all([
      TripRepository.findConflictingTrips({
        start: query.start,
        end: query.end,
        vehicleIds,
        excludeTripId: query.excludeTripId,
      }),
      TripRepository.findConflictingSchedules({
        start: query.start,
        end: query.end,
        vehicleIds,
      }),
      TripRepository.findMaintenanceBlocks(vehicleIds, query.start, query.end),
      DocumentRepository.findExpired(vehicleIds, query.end),
    ]);

    const tripsByVehicle = new Map<string, typeof trips>();
    for (const trip of trips) {
      const list = tripsByVehicle.get(trip.vehicleId) ?? [];
      list.push(trip);
      tripsByVehicle.set(trip.vehicleId, list);
    }

    return vehicles.map((vehicle) => {
      const blockers: string[] = [];
      const warnings: string[] = [];
      const capacity = effectiveSafariCapacity(vehicle);

      if (!vehicle.isActive || vehicle.deletedAt !== null) {
        blockers.push("Archived or inactive");
      }
      if (UNUSABLE_VEHICLE_STATUSES.includes(vehicle.status)) {
        blockers.push(`Status: ${vehicle.status.replace(/_/g, " ").toLowerCase()}`);
      }
      for (const trip of tripsByVehicle.get(vehicle.id) ?? []) {
        blockers.push(
          `On "${trip.destination}" ${timeRange(trip.scheduledStart, trip.scheduledEnd)}`
        );
      }
      for (const schedule of schedules) {
        if (schedule.vehicleId === vehicle.id) {
          blockers.push(
            `Booked on game drive "${schedule.route.name}" ${timeRange(schedule.startTime, schedule.endTime)}`
          );
        }
      }
      for (const block of maintenance) {
        if (block.vehicleId === vehicle.id) {
          blockers.push(
            block.status === MaintenanceStatus.IN_PROGRESS
              ? `In workshop: ${block.description}`
              : `${block.type.replace(/_/g, " ").toLowerCase()} booked in this window`
          );
        }
      }
      for (const doc of expiredDocs) {
        if (doc.vehicleId !== vehicle.id) continue;
        const label = doc.type.replace(/_/g, " ").toLowerCase();
        if (GROUNDING_DOCUMENT_TYPES.includes(doc.type)) {
          blockers.push(`Expired ${label}`);
        } else {
          warnings.push(`Expired ${label}`);
        }
      }
      if (query.guestCount > capacity) {
        blockers.push(`Seats ${capacity}, needs ${query.guestCount}`);
      }

      return {
        vehicle,
        isAvailable: blockers.length === 0,
        effectiveCapacity: capacity,
        blockers,
        warnings,
      };
    });
  },

  /** Same idea for drivers. */
  async listDriverAvailability(query: {
    propertyId: string;
    start: Date;
    end: Date;
    excludeTripId?: string;
  }): Promise<DriverAvailability[]> {
    const drivers = await DriverRepository.list({ propertyId: query.propertyId });
    if (drivers.length === 0) return [];

    const driverIds = drivers.map((d) => d.id);
    const employeeIds = drivers.map((d) => d.employeeId);

    const [trips, schedules] = await Promise.all([
      TripRepository.findConflictingTrips({
        start: query.start,
        end: query.end,
        driverIds,
        excludeTripId: query.excludeTripId,
      }),
      TripRepository.findConflictingSchedules({
        start: query.start,
        end: query.end,
        driverEmployeeIds: employeeIds,
      }),
    ]);

    return drivers.map((driver) => {
      const blockers: string[] = [];
      const warnings: string[] = [];

      if (!driver.isActive || driver.deletedAt !== null) blockers.push("Archived or inactive");
      if (driver.employmentStatus !== DriverEmploymentStatus.ACTIVE) {
        blockers.push(driver.employmentStatus.replace(/_/g, " ").toLowerCase());
      }
      if (!driver.isAvailable) blockers.push("Marked unavailable on the roster");
      if (driver.licenseExpiry.getTime() < query.end.getTime()) {
        blockers.push(`Licence expires ${driver.licenseExpiry.toISOString().slice(0, 10)}`);
      }

      for (const trip of trips) {
        if (trip.driverId === driver.id) {
          blockers.push(
            `On "${trip.destination}" ${timeRange(trip.scheduledStart, trip.scheduledEnd)}`
          );
        }
      }
      for (const schedule of schedules) {
        if (schedule.driverId === driver.employeeId) {
          blockers.push(
            `Booked on game drive "${schedule.route.name}" ${timeRange(schedule.startTime, schedule.endTime)}`
          );
        }
      }

      return {
        driver,
        isAvailable: blockers.length === 0,
        blockers,
        warnings,
      };
    });
  },

  /**
   * Derives what a vehicle is *actually* doing, from trips and maintenance
   * rather than from whatever the status column last said.
   *
   * Sticky manual states: OUT_OF_SERVICE and RETIRED are respected and never
   * cleared automatically — a grounded vehicle stays grounded until someone
   * explicitly returns it to service.
   */
  async deriveVehicleStatus(
    vehicleId: string,
    tx?: FleetTx,
    now: Date = new Date()
  ): Promise<VehicleStatus> {
    const client = tx ?? prisma;

    const vehicle = await client.vehicle.findUnique({
      where: { id: vehicleId },
      select: { status: true, deletedAt: true, isActive: true },
    });
    if (!vehicle) return VehicleStatus.OUT_OF_SERVICE;

    if (
      vehicle.deletedAt !== null ||
      !vehicle.isActive ||
      vehicle.status === VehicleStatus.OUT_OF_SERVICE ||
      vehicle.status === VehicleStatus.RETIRED
    ) {
      return vehicle.status === VehicleStatus.RETIRED
        ? VehicleStatus.RETIRED
        : VehicleStatus.OUT_OF_SERVICE;
    }

    if (await MaintenanceRepository.hasOpenWork(vehicleId, tx)) {
      return VehicleStatus.MAINTENANCE;
    }

    const inProgress = await client.safariTrip.findFirst({
      where: { vehicleId, status: SafariTripStatus.IN_PROGRESS },
      select: { scheduledEnd: true },
      orderBy: { scheduledStart: "asc" },
    });
    if (inProgress) {
      // Past its scheduled return but not checked in yet: it is on its way back.
      return inProgress.scheduledEnd.getTime() < now.getTime()
        ? VehicleStatus.RETURNING
        : VehicleStatus.ON_SAFARI;
    }

    const leadWindowEnd = new Date(now.getTime() + RESERVATION_LEAD_HOURS * 3_600_000);
    const imminent = await client.safariTrip.findFirst({
      where: {
        vehicleId,
        status: { in: [SafariTripStatus.SCHEDULED, SafariTripStatus.CONFIRMED] },
        scheduledStart: { lte: leadWindowEnd },
        scheduledEnd: { gt: now },
      },
      select: { id: true },
    });
    if (imminent) return VehicleStatus.RESERVED;

    // A vehicle sitting in MAINTENANCE with no open job stays there until a
    // human clears it; otherwise it is free.
    if (vehicle.status === VehicleStatus.MAINTENANCE) return VehicleStatus.MAINTENANCE;

    return VehicleStatus.AVAILABLE;
  },

  /** Derives and persists the vehicle's operational status. */
  async syncVehicleStatus(
    vehicleId: string,
    tx?: FleetTx,
    now: Date = new Date()
  ): Promise<VehicleStatus> {
    const derived = await this.deriveVehicleStatus(vehicleId, tx, now);
    await (tx ?? prisma).vehicle.update({
      where: { id: vehicleId },
      data: { status: derived },
    });
    return derived;
  },
};
