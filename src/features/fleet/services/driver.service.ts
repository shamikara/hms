import prisma from "@/core/db/prisma";
import { DriverEmploymentStatus, Prisma, SafariTripStatus } from "@prisma/client";
import { AppError } from "@/core/types/Result";
import { AuditLogger } from "@/core/audit/AuditLogger";
import { DriverRepository, type DriverRow } from "../repositories/driver.repository";
import type {
  DriverArchiveValues,
  DriverCreateValues,
  DriverUpdateValues,
} from "../validations/fleet.schema";

/**
 * Driver profiles. A driver is always an existing `Employee` — this service
 * refuses to create one otherwise, which is what stops the fleet module growing
 * a second, divergent people directory.
 */
export const DriverService = {
  async create(input: DriverCreateValues, userId: string): Promise<DriverRow> {
    const employee = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, deletedAt: true, driverProfile: { select: { id: true } } },
    });

    if (!employee) {
      throw new AppError(
        "NOT_FOUND",
        "No such employee. Create the staff record first, then register them as a driver."
      );
    }
    if (employee.deletedAt !== null) {
      throw new AppError("INVALID_STATE", "That employee record has been terminated.");
    }
    if (employee.driverProfile) {
      throw new AppError(
        "ALREADY_A_DRIVER",
        "That employee already has a driver profile."
      );
    }
    if (input.licenseExpiry.getTime() <= Date.now()) {
      throw new AppError(
        "VALIDATION_ERROR",
        "The driving licence expiry date is in the past."
      );
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const driver = await DriverRepository.create(
          {
            employeeId: input.employeeId,
            licenseNumber: input.licenseNumber,
            licenseExpiry: input.licenseExpiry,
            safariExperienceYears: input.safariExperienceYears,
            employmentStatus: input.employmentStatus,
            isAvailable: input.isAvailable,
            isActive: input.isActive,
            imageUrl: input.imageUrl ?? null,
            notes: input.notes ?? null,
          },
          tx
        );

        await AuditLogger.log(tx, userId, "CREATE", "SafariDriver", driver.id, null, {
          employeeId: driver.employeeId,
          licenseNumber: driver.licenseNumber,
          licenseExpiry: driver.licenseExpiry.toISOString(),
        });

        return driver;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_LICENSE",
          `Licence number ${input.licenseNumber} is already registered to another driver.`
        );
      }
      throw error;
    }
  },

  async update(input: DriverUpdateValues, userId: string): Promise<DriverRow> {
    const existing = await DriverRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Driver not found.");

    // Taking a driver off duty must not silently strand a trip they are on.
    const goingOffDuty =
      input.isAvailable === false ||
      input.isActive === false ||
      (input.employmentStatus !== undefined &&
        input.employmentStatus !== DriverEmploymentStatus.ACTIVE);

    if (goingOffDuty) {
      const assigned = await prisma.safariTrip.findFirst({
        where: {
          driverId: existing.id,
          status: {
            in: [
              SafariTripStatus.SCHEDULED,
              SafariTripStatus.CONFIRMED,
              SafariTripStatus.IN_PROGRESS,
            ],
          },
        },
        select: { id: true, destination: true, scheduledStart: true },
        orderBy: { scheduledStart: "asc" },
      });
      if (assigned) {
        throw new AppError(
          "HAS_UPCOMING_TRIPS",
          `This driver is still assigned to "${assigned.destination}" on ${assigned.scheduledStart.toISOString().slice(0, 10)}. Reassign that trip first.`
        );
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const updated = await DriverRepository.update(
          existing.id,
          {
            ...(input.licenseNumber !== undefined
              ? { licenseNumber: input.licenseNumber }
              : {}),
            ...(input.licenseExpiry !== undefined
              ? { licenseExpiry: input.licenseExpiry }
              : {}),
            ...(input.safariExperienceYears !== undefined
              ? { safariExperienceYears: input.safariExperienceYears }
              : {}),
            ...(input.employmentStatus !== undefined
              ? { employmentStatus: input.employmentStatus }
              : {}),
            ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
            ...(input.notes !== undefined ? { notes: input.notes } : {}),
          },
          tx
        );

        await AuditLogger.log(
          tx,
          userId,
          "UPDATE",
          "SafariDriver",
          updated.id,
          {
            employmentStatus: existing.employmentStatus,
            isAvailable: existing.isAvailable,
            licenseExpiry: existing.licenseExpiry.toISOString(),
          },
          {
            employmentStatus: updated.employmentStatus,
            isAvailable: updated.isAvailable,
            licenseExpiry: updated.licenseExpiry.toISOString(),
          }
        );

        return updated;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_LICENSE",
          "That licence number is already registered to another driver."
        );
      }
      throw error;
    }
  },

  /** Soft archive / restore. Historical trips and reviews keep their driver. */
  async setArchived(input: DriverArchiveValues, userId: string): Promise<DriverRow> {
    const existing = await DriverRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Driver not found.");

    if (input.archive) {
      const assigned = await prisma.safariTrip.findFirst({
        where: {
          driverId: existing.id,
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
      if (assigned) {
        throw new AppError(
          "HAS_UPCOMING_TRIPS",
          `Cannot archive: still assigned to "${assigned.destination}" on ${assigned.scheduledStart.toISOString().slice(0, 10)}.`
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = input.archive
        ? await DriverRepository.archive(existing.id, tx)
        : await DriverRepository.restore(existing.id, tx);

      await AuditLogger.log(
        tx,
        userId,
        input.archive ? "DELETE" : "UPDATE",
        "SafariDriver",
        updated.id,
        { deletedAt: existing.deletedAt?.toISOString() ?? null },
        { deletedAt: updated.deletedAt?.toISOString() ?? null }
      );

      return updated;
    });
  },
};
