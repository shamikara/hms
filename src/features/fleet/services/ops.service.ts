import prisma from "@/core/db/prisma";
import { MaintenanceStatus, Prisma, VehicleStatus } from "@prisma/client";
import { AppError } from "@/core/types/Result";
import { AuditLogger } from "@/core/audit/AuditLogger";
import {
  DocumentRepository,
  FuelRepository,
  MaintenanceRepository,
  type DocumentRow,
  type FuelLogRow,
  type MaintenanceRow,
} from "../repositories/ops.repository";
import { VehicleRepository } from "../repositories/vehicle.repository";
import { AvailabilityService } from "./availability.service";
import {
  calculateFuelEfficiency,
  buildFuelCostTrend,
  type FuelEfficiencyResult,
  type FuelCostTrendPoint,
} from "../lib/fuel";
import type {
  FuelLogCreateValues,
  MaintenanceCreateValues,
  MaintenanceUpdateValues,
  VehicleDocumentCreateValues,
  VehicleDocumentUpdateValues,
} from "../validations/fleet.schema";

/**
 * Maintenance, fuel and compliance-document operations.
 *
 * Cross-cutting behaviour worth knowing:
 *   - putting a job IN_PROGRESS grounds the vehicle, and closing it releases it,
 *     both by re-deriving the vehicle status rather than by writing it blindly;
 *   - a service or fill-up odometer reading advances `Vehicle.currentMileage`,
 *     but never backwards.
 */

export const MaintenanceService = {
  async create(
    input: MaintenanceCreateValues,
    userId: string,
    employeeId: string | null
  ): Promise<MaintenanceRow> {
    const vehicle = await VehicleRepository.findById(input.vehicleId);
    if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found.");

    if (
      input.mileageAtService !== undefined &&
      input.mileageAtService < vehicle.currentMileage - 100_000
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Service odometer reading looks wrong for this vehicle."
      );
    }
    if (
      input.nextServiceMileage !== undefined &&
      input.nextServiceMileage <= vehicle.currentMileage
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Next service odometer target (${input.nextServiceMileage} km) must be ahead of the current reading (${vehicle.currentMileage} km).`
      );
    }

    return prisma.$transaction(async (tx) => {
      const record = await MaintenanceRepository.create(
        {
          vehicleId: input.vehicleId,
          type: input.type,
          status: input.status,
          description: input.description,
          serviceProvider: input.serviceProvider ?? null,
          serviceDate: input.serviceDate,
          mileageAtService: input.mileageAtService ?? null,
          cost: new Prisma.Decimal(input.cost),
          currencyCode: input.currencyCode,
          partsReplaced: input.partsReplaced,
          nextServiceDate: input.nextServiceDate ?? null,
          nextServiceMileage: input.nextServiceMileage ?? null,
          notes: input.notes ?? null,
          documentUrl: input.documentUrl ?? null,
          recordedById: employeeId,
        },
        tx
      );

      if (input.mileageAtService !== undefined) {
        await VehicleRepository.advanceMileage(input.vehicleId, input.mileageAtService, tx);
      }

      // IN_PROGRESS work must ground the vehicle immediately.
      if (input.status === MaintenanceStatus.IN_PROGRESS) {
        await tx.vehicle.update({
          where: { id: input.vehicleId },
          data: { status: VehicleStatus.MAINTENANCE },
        });
      } else {
        await AvailabilityService.syncVehicleStatus(input.vehicleId, tx);
      }

      await AuditLogger.log(
        tx,
        userId,
        "CREATE",
        "VehicleMaintenance",
        record.id,
        null,
        {
          vehicleId: record.vehicleId,
          type: record.type,
          status: record.status,
          cost: record.cost.toString(),
        }
      );

      return record;
    });
  },

  async update(input: MaintenanceUpdateValues, userId: string): Promise<MaintenanceRow> {
    const existing = await MaintenanceRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Maintenance record not found.");

    return prisma.$transaction(async (tx) => {
      const updated = await MaintenanceRepository.update(
        existing.id,
        {
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.serviceProvider !== undefined
            ? { serviceProvider: input.serviceProvider }
            : {}),
          ...(input.serviceDate !== undefined ? { serviceDate: input.serviceDate } : {}),
          ...(input.mileageAtService !== undefined
            ? { mileageAtService: input.mileageAtService }
            : {}),
          ...(input.cost !== undefined ? { cost: new Prisma.Decimal(input.cost) } : {}),
          ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
          ...(input.partsReplaced !== undefined
            ? { partsReplaced: input.partsReplaced }
            : {}),
          ...(input.nextServiceDate !== undefined
            ? { nextServiceDate: input.nextServiceDate }
            : {}),
          ...(input.nextServiceMileage !== undefined
            ? { nextServiceMileage: input.nextServiceMileage }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.documentUrl !== undefined ? { documentUrl: input.documentUrl } : {}),
        },
        tx
      );

      if (input.mileageAtService !== undefined && input.mileageAtService !== null) {
        await VehicleRepository.advanceMileage(
          existing.vehicleId,
          input.mileageAtService,
          tx
        );
      }

      if (input.status !== undefined) {
        if (input.status === MaintenanceStatus.IN_PROGRESS) {
          await tx.vehicle.update({
            where: { id: existing.vehicleId },
            data: { status: VehicleStatus.MAINTENANCE },
          });
        } else {
          // Closing the last open job frees the vehicle: clear the sticky
          // MAINTENANCE flag first, then re-derive from live operations.
          const stillOpen = await MaintenanceRepository.hasOpenWork(existing.vehicleId, tx);
          if (!stillOpen) {
            await tx.vehicle.update({
              where: { id: existing.vehicleId },
              data: { status: VehicleStatus.AVAILABLE },
            });
          }
          await AvailabilityService.syncVehicleStatus(existing.vehicleId, tx);
        }
      }

      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "VehicleMaintenance",
        updated.id,
        { status: existing.status, cost: existing.cost.toString() },
        { status: updated.status, cost: updated.cost.toString() }
      );

      return updated;
    });
  },
};

export const FuelService = {
  async create(
    input: FuelLogCreateValues,
    userId: string,
    employeeId: string | null
  ): Promise<FuelLogRow> {
    const vehicle = await VehicleRepository.findById(input.vehicleId);
    if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found.");

    if (input.loggedAt.getTime() > Date.now() + 60 * 60 * 1000) {
      throw new AppError("VALIDATION_ERROR", "Fuel log date cannot be in the future.");
    }

    // The odometer must move forwards relative to the last recorded fill-up,
    // otherwise the tank-to-tank efficiency calculation produces nonsense.
    const previous = await prisma.vehicleFuelLog.findFirst({
      where: { vehicleId: input.vehicleId, loggedAt: { lte: input.loggedAt } },
      select: { mileage: true, loggedAt: true },
      orderBy: { loggedAt: "desc" },
    });
    if (previous && input.mileage < previous.mileage) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Odometer reading (${input.mileage} km) is below the previous fuel record (${previous.mileage} km on ${previous.loggedAt.toISOString().slice(0, 10)}).`
      );
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const log = await FuelRepository.create(
          {
            vehicleId: input.vehicleId,
            loggedAt: input.loggedAt,
            mileage: input.mileage,
            litres: new Prisma.Decimal(input.litres),
            totalCost: new Prisma.Decimal(input.totalCost),
            currencyCode: input.currencyCode,
            station: input.station ?? null,
            receiptRef: input.receiptRef ?? null,
            notes: input.notes ?? null,
            recordedById: employeeId,
          },
          tx
        );

        await VehicleRepository.advanceMileage(input.vehicleId, input.mileage, tx);

        await AuditLogger.log(tx, userId, "CREATE", "VehicleFuelLog", log.id, null, {
          vehicleId: log.vehicleId,
          mileage: log.mileage,
          litres: log.litres.toString(),
          totalCost: log.totalCost.toString(),
        });

        return log;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_FUEL_LOG",
          "An identical fuel record already exists for this vehicle, time and odometer reading."
        );
      }
      throw error;
    }
  },

  /**
   * Efficiency for one vehicle. Returns nulls with a reason when there are not
   * enough records — the caller must show that reason rather than a zero.
   */
  async efficiencyForVehicle(
    vehicleId: string,
    from?: Date,
    to?: Date
  ): Promise<FuelEfficiencyResult> {
    const points = await FuelRepository.pointsForVehicle(vehicleId, from, to);
    return calculateFuelEfficiency(
      points.map((p) => ({
        mileage: p.mileage,
        litres: Number(p.litres),
        cost: Number(p.totalCost),
        loggedAt: p.loggedAt,
      }))
    );
  },

  async costTrendForVehicle(
    vehicleId: string,
    from?: Date,
    to?: Date
  ): Promise<FuelCostTrendPoint[]> {
    const points = await FuelRepository.pointsForVehicle(vehicleId, from, to);
    return buildFuelCostTrend(
      points.map((p) => ({
        mileage: p.mileage,
        litres: Number(p.litres),
        cost: Number(p.totalCost),
        loggedAt: p.loggedAt,
      }))
    );
  },
};

export const DocumentService = {
  async create(
    input: VehicleDocumentCreateValues,
    userId: string
  ): Promise<DocumentRow> {
    const vehicle = await VehicleRepository.findById(input.vehicleId);
    if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found.");

    try {
      return await prisma.$transaction(async (tx) => {
        const doc = await DocumentRepository.create(
          {
            vehicleId: input.vehicleId,
            type: input.type,
            documentNumber: input.documentNumber,
            issueDate: input.issueDate,
            expiryDate: input.expiryDate,
            fileUrl: input.fileUrl ?? null,
            notes: input.notes ?? null,
          },
          tx
        );

        await AuditLogger.log(tx, userId, "CREATE", "VehicleDocument", doc.id, null, {
          vehicleId: doc.vehicleId,
          type: doc.type,
          documentNumber: doc.documentNumber,
          expiryDate: doc.expiryDate.toISOString(),
        });

        return doc;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_DOCUMENT",
          "That document number is already recorded for this vehicle and document type."
        );
      }
      throw error;
    }
  },

  async update(
    input: VehicleDocumentUpdateValues,
    userId: string
  ): Promise<DocumentRow> {
    const existing = await DocumentRepository.findById(input.id);
    if (!existing) throw new AppError("NOT_FOUND", "Document not found.");

    const issueDate = input.issueDate ?? existing.issueDate;
    const expiryDate = input.expiryDate ?? existing.expiryDate;
    if (expiryDate <= issueDate) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Expiry date must be after the issue date."
      );
    }

    return prisma.$transaction(async (tx) => {
      const updated = await DocumentRepository.update(
        existing.id,
        {
          ...(input.documentNumber !== undefined
            ? { documentNumber: input.documentNumber }
            : {}),
          ...(input.issueDate !== undefined ? { issueDate: input.issueDate } : {}),
          ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
          ...(input.fileUrl !== undefined ? { fileUrl: input.fileUrl } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
        tx
      );

      await AuditLogger.log(
        tx,
        userId,
        "UPDATE",
        "VehicleDocument",
        updated.id,
        { expiryDate: existing.expiryDate.toISOString() },
        { expiryDate: updated.expiryDate.toISOString() }
      );

      return updated;
    });
  },

  /** Soft delete, so a superseded certificate stays auditable. */
  async archive(id: string, userId: string): Promise<DocumentRow> {
    const existing = await DocumentRepository.findById(id);
    if (!existing) throw new AppError("NOT_FOUND", "Document not found.");

    return prisma.$transaction(async (tx) => {
      const updated = await DocumentRepository.archive(id, tx);
      await AuditLogger.log(
        tx,
        userId,
        "DELETE",
        "VehicleDocument",
        id,
        { deletedAt: null },
        { deletedAt: updated.deletedAt?.toISOString() ?? null }
      );
      return updated;
    });
  },
};
