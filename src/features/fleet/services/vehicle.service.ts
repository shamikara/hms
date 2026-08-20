import prisma from "@/core/db/prisma";
import { Prisma, SafariTripStatus, VehicleStatus } from "@prisma/client";
import { AppError } from "@/core/types/Result";
import { AuditLogger } from "@/core/audit/AuditLogger";
import { VehicleRepository, type VehicleRow } from "../repositories/vehicle.repository";
import { MaintenanceRepository } from "../repositories/ops.repository";
import { AvailabilityService } from "./availability.service";
import type {
  VehicleArchiveValues,
  VehicleCreateValues,
  VehicleStatusChangeValues,
  VehicleUpdateValues,
} from "../validations/fleet.schema";

/** Statuses a human may set directly. The rest are derived from operations. */
const MANUALLY_SETTABLE: VehicleStatus[] = [
  VehicleStatus.AVAILABLE,
  VehicleStatus.MAINTENANCE,
  VehicleStatus.OUT_OF_SERVICE,
];

export const VehicleService = {
  async create(input: VehicleCreateValues, userId: string): Promise<VehicleRow> {
    try {
      return await prisma.$transaction(async (tx) => {
        const vehicle = await VehicleRepository.create(
          {
            propertyId: input.propertyId,
            plateNumber: input.plateNumber,
            displayName: input.displayName ?? null,
            make: input.make ?? null,
            model: input.model ?? null,
            vehicleType: input.vehicleType,
            capacity: input.capacity,
            safariCapacity: input.safariCapacity ?? null,
            fuelType: input.fuelType,
            ownershipType: input.ownershipType,
            purchaseYear: input.purchaseYear ?? null,
            currentMileage: input.currentMileage,
            status: input.status,
            isActive: input.isActive,
            notes: input.notes ?? null,
            imageUrls: input.imageUrls,
          },
          tx
        );

        await AuditLogger.log(tx, userId, "CREATE", "Vehicle", vehicle.id, null, {
          plateNumber: vehicle.plateNumber,
          capacity: vehicle.capacity,
          status: vehicle.status,
        });

        return vehicle;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_PLATE",
          `Registration number ${input.plateNumber} is already in use at this property.`
        );
      }
      throw error;
    }
  },

  async update(input: VehicleUpdateValues, userId: string): Promise<VehicleRow> {
    const existing = await VehicleRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Vehicle not found.");

    const capacity = input.capacity ?? existing.capacity;
    const safariCapacity =
      input.safariCapacity === undefined ? existing.safariCapacity : input.safariCapacity;

    if (safariCapacity !== null && safariCapacity > capacity) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Safari capacity cannot exceed seating capacity."
      );
    }

    // Shrinking capacity must not orphan trips that are already booked fuller.
    if (capacity < existing.capacity || (safariCapacity ?? capacity) < (existing.safariCapacity ?? existing.capacity)) {
      const overbooked = await prisma.safariTrip.findFirst({
        where: {
          vehicleId: existing.id,
          status: {
            in: [
              SafariTripStatus.SCHEDULED,
              SafariTripStatus.CONFIRMED,
              SafariTripStatus.IN_PROGRESS,
            ],
          },
          guestCount: { gt: safariCapacity ?? capacity },
        },
        select: { id: true, destination: true, guestCount: true },
      });
      if (overbooked) {
        throw new AppError(
          "CAPACITY_CONFLICT",
          `Cannot reduce capacity: upcoming trip "${overbooked.destination}" already has ${overbooked.guestCount} guests booked.`
        );
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const updated = await VehicleRepository.update(
          existing.id,
          {
            ...(input.plateNumber !== undefined ? { plateNumber: input.plateNumber } : {}),
            ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
            ...(input.make !== undefined ? { make: input.make } : {}),
            ...(input.model !== undefined ? { model: input.model } : {}),
            ...(input.vehicleType !== undefined ? { vehicleType: input.vehicleType } : {}),
            ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
            ...(input.safariCapacity !== undefined
              ? { safariCapacity: input.safariCapacity }
              : {}),
            ...(input.fuelType !== undefined ? { fuelType: input.fuelType } : {}),
            ...(input.ownershipType !== undefined
              ? { ownershipType: input.ownershipType }
              : {}),
            ...(input.purchaseYear !== undefined ? { purchaseYear: input.purchaseYear } : {}),
            ...(input.currentMileage !== undefined
              ? { currentMileage: input.currentMileage }
              : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
            ...(input.imageUrls !== undefined ? { imageUrls: input.imageUrls } : {}),
          },
          tx
        );

        await AuditLogger.log(
          tx,
          userId,
          "UPDATE",
          "Vehicle",
          updated.id,
          { plateNumber: existing.plateNumber, capacity: existing.capacity, isActive: existing.isActive },
          { plateNumber: updated.plateNumber, capacity: updated.capacity, isActive: updated.isActive }
        );

        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_PLATE",
          "That registration number is already in use at this property."
        );
      }
      throw error;
    }
  },

  /**
   * Manual status change. Only the three "human decision" statuses can be set
   * this way; ON_SAFARI / RESERVED / RETURNING are derived from live trips, and
   * letting staff type them in would put the diary and the badge out of sync.
   */
  async changeStatus(
    input: VehicleStatusChangeValues,
    userId: string
  ): Promise<VehicleRow> {
    if (!MANUALLY_SETTABLE.includes(input.status)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `${input.status} is derived from trip activity and cannot be set by hand.`
      );
    }

    const existing = await VehicleRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Vehicle not found.");

    if (input.status === VehicleStatus.AVAILABLE) {
      if (await MaintenanceRepository.hasOpenWork(existing.id)) {
        throw new AppError(
          "MAINTENANCE_OPEN",
          "This vehicle still has maintenance in progress. Close the job before returning it to service."
        );
      }
    }

    if (input.status !== VehicleStatus.AVAILABLE) {
      const active = await prisma.safariTrip.findFirst({
        where: { vehicleId: existing.id, status: SafariTripStatus.IN_PROGRESS },
        select: { id: true, destination: true },
      });
      if (active) {
        throw new AppError(
          "TRIP_IN_PROGRESS",
          `This vehicle is out on "${active.destination}". Complete that trip first.`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      await VehicleRepository.update(
        existing.id,
        {
          status: input.status,
          ...(input.reason
            ? {
                notes: existing.notes
                  ? `${existing.notes}\n[${new Date().toISOString().slice(0, 10)}] ${input.reason}`
                  : `[${new Date().toISOString().slice(0, 10)}] ${input.reason}`,
              }
            : {}),
        },
        tx
      );

      // Re-derive, so setting AVAILABLE on a vehicle with an imminent trip lands
      // on RESERVED rather than a status the diary contradicts.
      const derived = await AvailabilityService.syncVehicleStatus(existing.id, tx);

      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "Vehicle",
        existing.id,
        { status: existing.status },
        { status: derived, requested: input.status, reason: input.reason ?? null }
      );

      const refreshed = await VehicleRepository.findById(existing.id);
      if (!refreshed) throw new AppError("NOT_FOUND", "Vehicle not found.");
      return refreshed;
    });
  },

  /**
   * Archive (soft delete) or restore. Never a hard delete: trips, reviews, fuel
   * and maintenance history all reference the row.
   */
  async setArchived(input: VehicleArchiveValues, userId: string): Promise<VehicleRow> {
    const existing = await VehicleRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Vehicle not found.");

    if (input.archive) {
      const upcoming = await prisma.safariTrip.findFirst({
        where: {
          vehicleId: existing.id,
          status: {
            in: [
              SafariTripStatus.SCHEDULED,
              SafariTripStatus.CONFIRMED,
              SafariTripStatus.IN_PROGRESS,
            ],
          },
        },
        select: { id: true, destination: true, scheduledStart: true },
      });
      if (upcoming) {
        throw new AppError(
          "HAS_UPCOMING_TRIPS",
          `Cannot archive: "${upcoming.destination}" on ${upcoming.scheduledStart.toISOString().slice(0, 10)} is still assigned to this vehicle.`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = input.archive
        ? await VehicleRepository.archive(existing.id, tx)
        : await VehicleRepository.restore(existing.id, tx);

      await AuditLogger.log(
        tx,
        userId,
        input.archive ? "DELETE" : "UPDATE",
        "Vehicle",
        updated.id,
        { deletedAt: existing.deletedAt?.toISOString() ?? null, isActive: existing.isActive },
        { deletedAt: updated.deletedAt?.toISOString() ?? null, isActive: updated.isActive }
      );

      return updated;
    });
  },
};
