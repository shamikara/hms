import prisma from "@/core/db/prisma";
import { Prisma, SafariTripStatus, VehicleStatus } from "@prisma/client";
import { AppError } from "@/core/types/Result";
import { AuditLogger } from "@/core/audit/AuditLogger";
import { Logger } from "@/core/logging/Logger";
import { AvailabilityService } from "./availability.service";
import { TripRepository, type TripRow } from "../repositories/trip.repository";
import { VehicleRepository, type FleetTx } from "../repositories/vehicle.repository";
import type {
  TripCancelValues,
  TripCompleteValues,
  TripCreateValues,
  TripStartValues,
  TripUpdateValues,
} from "../validations/fleet.schema";

/**
 * Trip lifecycle: assign -> start -> complete (or cancel).
 *
 * Concurrency strategy, in layers:
 *   1. every mutation runs in a SERIALIZABLE transaction, and the conflict check
 *      is re-run *inside* it — a stale availability preview cannot be committed;
 *   2. the database has EXCLUDE constraints on (vehicle, window) and
 *      (driver, window) for non-cancelled trips, so even a serialization
 *      interleaving the application misses is refused by Postgres;
 *   3. edits use the `version` column for optimistic locking, so two
 *      dispatchers editing the same trip cannot silently overwrite each other.
 *
 * Serialization failures are retried once; anything beyond that is reported to
 * the user rather than retried forever.
 */

const logger = new Logger("FleetTripService");

/** Postgres serialization failure / deadlock, surfaced by Prisma as P2034. */
const RETRYABLE_CODES = new Set(["P2034", "40001", "40P01"]);

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  timeout: 15_000,
} as const;

function isRetryable(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return RETRYABLE_CODES.has(error.code);
  }
  const message = error instanceof Error ? error.message : "";
  return message.includes("could not serialize access") || message.includes("40001");
}

/** The DB-level overlap guard fired; translate it into a user-facing conflict. */
function isExclusionViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return message.includes("exclusion constraint") || message.includes("23P01");
}

async function runInTransaction<T>(fn: (tx: FleetTx) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(fn, TRANSACTION_OPTIONS);
  } catch (error) {
    if (isRetryable(error)) {
      logger.warn("Retrying fleet transaction after serialization failure");
      try {
        return await prisma.$transaction(fn, TRANSACTION_OPTIONS);
      } catch (retryError) {
        if (isExclusionViolation(retryError)) {
          throw new AppError(
            "ASSIGNMENT_CONFLICT",
            "Another dispatcher booked this vehicle or driver for an overlapping window. Please refresh and try again."
          );
        }
        throw retryError;
      }
    }
    if (isExclusionViolation(error)) {
      throw new AppError(
        "ASSIGNMENT_CONFLICT",
        "Another dispatcher booked this vehicle or driver for an overlapping window. Please refresh and try again."
      );
    }
    throw error;
  }
}

function conflictError(messages: string[]): AppError {
  return new AppError("ASSIGNMENT_CONFLICT", messages.join(" "), {
    conflicts: messages,
  });
}

/** Snapshot written to the audit log; keeps Date/Decimal out of the JSON column. */
function auditSnapshot(trip: TripRow): Record<string, unknown> {
  return {
    status: trip.status,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    guideId: trip.guideId,
    scheduledStart: trip.scheduledStart.toISOString(),
    scheduledEnd: trip.scheduledEnd.toISOString(),
    guestCount: trip.guestCount,
    startMileage: trip.startMileage,
    endMileage: trip.endMileage,
    distanceKm: trip.distanceKm,
  };
}

export const TripService = {
  /**
   * Creates an assignment. Guest is inherited from the safari booking when one
   * is supplied, so the review flow later knows who is entitled to review.
   */
  async createTrip(input: TripCreateValues, userId: string): Promise<TripRow> {
    return runInTransaction(async (tx) => {
      let guestId = input.guestId ?? null;
      let guestCount = input.guestCount;

      if (input.bookingId) {
        const booking = await tx.safariBooking.findUnique({
          where: { id: input.bookingId },
          select: {
            id: true,
            guestCount: true,
            trip: { select: { id: true } },
            stay: { select: { reservation: { select: { guestId: true } } } },
          },
        });
        if (!booking) {
          throw new AppError("NOT_FOUND", "The safari booking no longer exists.");
        }
        if (booking.trip) {
          throw new AppError(
            "ALREADY_DISPATCHED",
            "That safari booking has already been dispatched on a trip."
          );
        }
        guestId = guestId ?? booking.stay.reservation.guestId;
        guestCount = input.guestCount ?? booking.guestCount;
      }

      if (input.scheduleId) {
        const schedule = await tx.safariSchedule.findUnique({
          where: { id: input.scheduleId },
          select: { id: true, trip: { select: { id: true } } },
        });
        if (!schedule) {
          throw new AppError("NOT_FOUND", "The game drive schedule no longer exists.");
        }
        if (schedule.trip) {
          throw new AppError(
            "ALREADY_DISPATCHED",
            "That game drive has already been dispatched on a trip."
          );
        }
      }

      const conflicts = await AvailabilityService.checkAssignment(
        {
          start: input.scheduledStart,
          end: input.scheduledEnd,
          guestCount,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          guideId: input.guideId,
        },
        tx
      );
      if (conflicts.length > 0) {
        throw conflictError(conflicts.map((c) => c.message));
      }

      const trip = await TripRepository.create(
        {
          propertyId: input.propertyId,
          vehicleId: input.vehicleId,
          driverId: input.driverId,
          guideId: input.guideId ?? null,
          routeId: input.routeId ?? null,
          scheduleId: input.scheduleId ?? null,
          bookingId: input.bookingId ?? null,
          guestId,
          destination: input.destination,
          tripType: input.tripType,
          status: input.status,
          scheduledStart: input.scheduledStart,
          scheduledEnd: input.scheduledEnd,
          guestCount,
          operationalNotes: input.operationalNotes ?? null,
        },
        tx
      );

      await AvailabilityService.syncVehicleStatus(trip.vehicleId, tx);
      await AuditLogger.log(
        tx,
        userId,
        "CREATE",
        "SafariTrip",
        trip.id,
        null,
        auditSnapshot(trip)
      );

      return trip;
    });
  },

  /**
   * Dispatches an existing (legacy) `SafariSchedule` as an operational trip,
   * carrying its route, window, guide and guest count across. This is the bridge
   * between the original booking flow and fleet operations.
   */
  async dispatchSchedule(
    scheduleId: string,
    driverId: string,
    userId: string,
    destination?: string
  ): Promise<TripRow> {
    const schedule = await prisma.safariSchedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        vehicleId: true,
        routeId: true,
        guideId: true,
        startTime: true,
        endTime: true,
        trip: { select: { id: true } },
        route: { select: { name: true, propertyId: true } },
        bookings: {
          select: {
            id: true,
            guestCount: true,
            stay: { select: { reservation: { select: { guestId: true } } } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!schedule) throw new AppError("NOT_FOUND", "Game drive schedule not found.");
    if (schedule.trip) {
      throw new AppError(
        "ALREADY_DISPATCHED",
        "That game drive has already been dispatched on a trip."
      );
    }

    const guestCount = schedule.bookings.reduce((sum, b) => sum + b.guestCount, 0);
    if (guestCount === 0) {
      throw new AppError(
        "NO_GUESTS",
        "That game drive has no bookings yet, so there is nothing to dispatch."
      );
    }

    // Multiple bookings can share one game drive. The trip carries a single
    // guest for review eligibility, so we attach the first booking's guest and
    // leave the rest linked through the schedule.
    const primary = schedule.bookings[0];

    return this.createTrip(
      {
        propertyId: schedule.route.propertyId,
        vehicleId: schedule.vehicleId,
        driverId,
        guideId: schedule.guideId,
        routeId: schedule.routeId,
        scheduleId: schedule.id,
        bookingId: primary.id,
        guestId: primary.stay.reservation.guestId,
        destination: destination ?? schedule.route.name,
        tripType: "MORNING_GAME_DRIVE",
        scheduledStart: schedule.startTime,
        scheduledEnd: schedule.endTime,
        guestCount,
        status: SafariTripStatus.CONFIRMED,
        operationalNotes: undefined,
      },
      userId
    );
  },

  /** Reassigns or reschedules a trip that has not departed yet. */
  async updateTrip(input: TripUpdateValues, userId: string): Promise<TripRow> {
    return runInTransaction(async (tx) => {
      const existing = await TripRepository.findById(input.id, tx);
      if (!existing) throw new AppError("NOT_FOUND", "Trip not found.");

      if (
        existing.status === SafariTripStatus.IN_PROGRESS ||
        existing.status === SafariTripStatus.COMPLETED
      ) {
        throw new AppError(
          "INVALID_STATE",
          "A trip that has already departed cannot be reassigned. Complete or cancel it instead."
        );
      }

      const next = {
        vehicleId: input.vehicleId ?? existing.vehicleId,
        driverId: input.driverId ?? existing.driverId,
        guideId: input.guideId === null ? null : (input.guideId ?? existing.guideId),
        scheduledStart: input.scheduledStart ?? existing.scheduledStart,
        scheduledEnd: input.scheduledEnd ?? existing.scheduledEnd,
        guestCount: input.guestCount ?? existing.guestCount,
      };

      if (next.scheduledEnd <= next.scheduledStart) {
        throw new AppError("VALIDATION_ERROR", "Return time must be after departure time.");
      }

      const isCancelling = input.status === SafariTripStatus.CANCELLED;
      if (!isCancelling) {
        const conflicts = await AvailabilityService.checkAssignment(
          {
            start: next.scheduledStart,
            end: next.scheduledEnd,
            guestCount: next.guestCount,
            vehicleId: next.vehicleId,
            driverId: next.driverId,
            guideId: next.guideId ?? undefined,
            excludeTripId: existing.id,
          },
          tx
        );
        if (conflicts.length > 0) throw conflictError(conflicts.map((c) => c.message));
      }

      const updated = await TripRepository.updateWithVersion(
        existing.id,
        input.version,
        {
          vehicleId: next.vehicleId,
          driverId: next.driverId,
          guideId: next.guideId,
          routeId: input.routeId === null ? null : (input.routeId ?? existing.routeId),
          destination: input.destination ?? existing.destination,
          tripType: input.tripType ?? existing.tripType,
          status: input.status ?? existing.status,
          scheduledStart: next.scheduledStart,
          scheduledEnd: next.scheduledEnd,
          guestCount: next.guestCount,
          operationalNotes: input.operationalNotes ?? existing.operationalNotes,
        },
        tx
      );

      if (!updated) {
        throw new AppError(
          "CONCURRENCY_ERROR",
          "This trip was changed by someone else. Refresh and try again."
        );
      }

      // Both the vacated and the newly booked vehicle need their status re-derived.
      await AvailabilityService.syncVehicleStatus(updated.vehicleId, tx);
      if (existing.vehicleId !== updated.vehicleId) {
        await AvailabilityService.syncVehicleStatus(existing.vehicleId, tx);
      }

      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "SafariTrip",
        updated.id,
        auditSnapshot(existing),
        auditSnapshot(updated)
      );

      return updated;
    });
  },

  /** Marks departure: trip IN_PROGRESS, vehicle ON_SAFARI, odometer recorded. */
  async startTrip(input: TripStartValues, userId: string): Promise<TripRow> {
    return runInTransaction(async (tx) => {
      const existing = await TripRepository.findById(input.id, tx);
      if (!existing) throw new AppError("NOT_FOUND", "Trip not found.");

      if (
        existing.status !== SafariTripStatus.SCHEDULED &&
        existing.status !== SafariTripStatus.CONFIRMED
      ) {
        throw new AppError(
          "INVALID_STATE",
          `A trip in status ${existing.status} cannot be started.`
        );
      }

      if (input.startMileage < existing.vehicle.currentMileage) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Starting odometer (${input.startMileage} km) is below the vehicle's recorded mileage (${existing.vehicle.currentMileage} km).`
        );
      }

      const updated = await TripRepository.updateWithVersion(
        existing.id,
        existing.version,
        {
          status: SafariTripStatus.IN_PROGRESS,
          actualDeparture: input.actualDeparture ?? new Date(),
          startMileage: input.startMileage,
          startFuelLevel: input.startFuelLevel ?? null,
          operationalNotes: input.operationalNotes ?? existing.operationalNotes,
        },
        tx
      );
      if (!updated) {
        throw new AppError(
          "CONCURRENCY_ERROR",
          "This trip was changed by someone else. Refresh and try again."
        );
      }

      await VehicleRepository.advanceMileage(updated.vehicleId, input.startMileage, tx);
      await AvailabilityService.syncVehicleStatus(updated.vehicleId, tx);
      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "SafariTrip",
        updated.id,
        auditSnapshot(existing),
        auditSnapshot(updated)
      );

      return updated;
    });
  },

  /**
   * Closes the trip out: records the return odometer, derives the distance,
   * releases the vehicle, and makes the trip reviewable by its guest.
   */
  async completeTrip(input: TripCompleteValues, userId: string): Promise<TripRow> {
    return runInTransaction(async (tx) => {
      const existing = await TripRepository.findById(input.id, tx);
      if (!existing) throw new AppError("NOT_FOUND", "Trip not found.");

      if (existing.status !== SafariTripStatus.IN_PROGRESS) {
        throw new AppError(
          "INVALID_STATE",
          "Only a trip that is in progress can be completed."
        );
      }
      if (existing.startMileage === null) {
        throw new AppError(
          "INVALID_STATE",
          "This trip has no starting odometer reading, so its distance cannot be derived."
        );
      }
      if (input.endMileage < existing.startMileage) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Return odometer (${input.endMileage} km) is below the departure reading (${existing.startMileage} km).`
        );
      }

      const distanceKm = input.endMileage - existing.startMileage;

      const updated = await TripRepository.updateWithVersion(
        existing.id,
        existing.version,
        {
          status: SafariTripStatus.COMPLETED,
          actualReturn: input.actualReturn ?? new Date(),
          endMileage: input.endMileage,
          endFuelLevel: input.endFuelLevel ?? null,
          distanceKm,
          operationalNotes: input.operationalNotes ?? existing.operationalNotes,
          incidentNotes: input.incidentNotes ?? existing.incidentNotes,
        },
        tx
      );
      if (!updated) {
        throw new AppError(
          "CONCURRENCY_ERROR",
          "This trip was changed by someone else. Refresh and try again."
        );
      }

      await VehicleRepository.advanceMileage(updated.vehicleId, input.endMileage, tx);

      if (input.sendToMaintenance) {
        // Explicit staff decision, so it is a sticky manual state rather than a
        // derived one: the vehicle stays out until someone returns it to service.
        await tx.vehicle.update({
          where: { id: updated.vehicleId },
          data: { status: VehicleStatus.MAINTENANCE },
        });
      } else {
        await AvailabilityService.syncVehicleStatus(updated.vehicleId, tx);
      }

      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "SafariTrip",
        updated.id,
        auditSnapshot(existing),
        { ...auditSnapshot(updated), sentToMaintenance: input.sendToMaintenance }
      );

      return updated;
    });
  },

  async cancelTrip(input: TripCancelValues, userId: string): Promise<TripRow> {
    return runInTransaction(async (tx) => {
      const existing = await TripRepository.findById(input.id, tx);
      if (!existing) throw new AppError("NOT_FOUND", "Trip not found.");

      if (existing.status === SafariTripStatus.COMPLETED) {
        throw new AppError(
          "INVALID_STATE",
          "A completed trip cannot be cancelled; its record is historical."
        );
      }
      if (existing.status === SafariTripStatus.CANCELLED) return existing;

      const note = `Cancelled: ${input.reason}`;
      const updated = await TripRepository.updateWithVersion(
        existing.id,
        existing.version,
        {
          status: SafariTripStatus.CANCELLED,
          operationalNotes: existing.operationalNotes
            ? `${existing.operationalNotes}\n${note}`
            : note,
        },
        tx
      );
      if (!updated) {
        throw new AppError(
          "CONCURRENCY_ERROR",
          "This trip was changed by someone else. Refresh and try again."
        );
      }

      await AvailabilityService.syncVehicleStatus(updated.vehicleId, tx);
      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "SafariTrip",
        updated.id,
        auditSnapshot(existing),
        auditSnapshot(updated)
      );

      return updated;
    });
  },
};
