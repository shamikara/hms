import prisma from "@/core/db/prisma";
import { MaintenanceStatus, Prisma } from "@prisma/client";
import type { FleetTx } from "./vehicle.repository";

/**
 * Maintenance, fuel and compliance-document persistence. Grouped in one file
 * because they are all simple vehicle-scoped ledgers with the same shape of
 * access; the interesting logic lives in the services.
 */

export const maintenanceSelect = {
  id: true,
  vehicleId: true,
  type: true,
  status: true,
  description: true,
  serviceProvider: true,
  serviceDate: true,
  mileageAtService: true,
  cost: true,
  currencyCode: true,
  partsReplaced: true,
  nextServiceDate: true,
  nextServiceMileage: true,
  notes: true,
  documentUrl: true,
  recordedById: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: { id: true, plateNumber: true, displayName: true, currentMileage: true },
  },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.VehicleMaintenanceSelect;

export type MaintenanceRow = Prisma.VehicleMaintenanceGetPayload<{
  select: typeof maintenanceSelect;
}>;

export const fuelLogSelect = {
  id: true,
  vehicleId: true,
  loggedAt: true,
  mileage: true,
  litres: true,
  totalCost: true,
  currencyCode: true,
  station: true,
  receiptRef: true,
  notes: true,
  recordedById: true,
  createdAt: true,
  vehicle: { select: { id: true, plateNumber: true, displayName: true } },
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.VehicleFuelLogSelect;

export type FuelLogRow = Prisma.VehicleFuelLogGetPayload<{ select: typeof fuelLogSelect }>;

export const documentSelect = {
  id: true,
  vehicleId: true,
  type: true,
  documentNumber: true,
  issueDate: true,
  expiryDate: true,
  fileUrl: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  vehicle: { select: { id: true, plateNumber: true, displayName: true } },
} satisfies Prisma.VehicleDocumentSelect;

export type DocumentRow = Prisma.VehicleDocumentGetPayload<{
  select: typeof documentSelect;
}>;

export const MaintenanceRepository = {
  async list(filters: {
    propertyId?: string;
    vehicleId?: string;
    status?: MaintenanceStatus;
    take?: number;
  }): Promise<MaintenanceRow[]> {
    return prisma.vehicleMaintenance.findMany({
      where: {
        ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.propertyId ? { vehicle: { propertyId: filters.propertyId } } : {}),
      },
      select: maintenanceSelect,
      orderBy: { serviceDate: "desc" },
      take: filters.take ?? 100,
    });
  },

  async findById(id: string, tx?: FleetTx): Promise<MaintenanceRow | null> {
    return (tx ?? prisma).vehicleMaintenance.findUnique({
      where: { id },
      select: maintenanceSelect,
    });
  },

  async create(
    data: Prisma.VehicleMaintenanceUncheckedCreateInput,
    tx?: FleetTx
  ): Promise<MaintenanceRow> {
    return (tx ?? prisma).vehicleMaintenance.create({ data, select: maintenanceSelect });
  },

  async update(
    id: string,
    data: Prisma.VehicleMaintenanceUpdateInput,
    tx?: FleetTx
  ): Promise<MaintenanceRow> {
    return (tx ?? prisma).vehicleMaintenance.update({
      where: { id },
      data,
      select: maintenanceSelect,
    });
  },

  /** True when the vehicle has a job actively in the workshop. */
  async hasOpenWork(vehicleId: string, tx?: FleetTx): Promise<boolean> {
    const count = await (tx ?? prisma).vehicleMaintenance.count({
      where: { vehicleId, status: MaintenanceStatus.IN_PROGRESS },
    });
    return count > 0;
  },

  /**
   * The most recent completed job per vehicle, which is what carries the
   * "next service" targets used for due/overdue warnings.
   */
  async latestCompletedByVehicle(propertyId: string) {
    return prisma.vehicleMaintenance.findMany({
      where: {
        status: MaintenanceStatus.COMPLETED,
        vehicle: { propertyId, deletedAt: null },
        OR: [{ nextServiceDate: { not: null } }, { nextServiceMileage: { not: null } }],
      },
      select: {
        vehicleId: true,
        serviceDate: true,
        nextServiceDate: true,
        nextServiceMileage: true,
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            displayName: true,
            currentMileage: true,
          },
        },
      },
      orderBy: { serviceDate: "desc" },
    });
  },

  async sumCost(propertyId: string, from: Date, to: Date, vehicleId?: string) {
    const result = await prisma.vehicleMaintenance.aggregate({
      where: {
        serviceDate: { gte: from, lte: to },
        status: { in: [MaintenanceStatus.COMPLETED, MaintenanceStatus.IN_PROGRESS] },
        ...(vehicleId ? { vehicleId } : { vehicle: { propertyId } }),
      },
      _sum: { cost: true },
      _count: { _all: true },
    });
    return {
      total: result._sum.cost ? Number(result._sum.cost) : 0,
      count: result._count._all,
    };
  },
};

export const FuelRepository = {
  async list(filters: {
    propertyId?: string;
    vehicleId?: string;
    from?: Date;
    to?: Date;
    take?: number;
  }): Promise<FuelLogRow[]> {
    return prisma.vehicleFuelLog.findMany({
      where: {
        ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters.propertyId ? { vehicle: { propertyId: filters.propertyId } } : {}),
        ...(filters.from || filters.to
          ? {
              loggedAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      select: fuelLogSelect,
      orderBy: { loggedAt: "desc" },
      take: filters.take ?? 200,
    });
  },

  async create(
    data: Prisma.VehicleFuelLogUncheckedCreateInput,
    tx?: FleetTx
  ): Promise<FuelLogRow> {
    return (tx ?? prisma).vehicleFuelLog.create({ data, select: fuelLogSelect });
  },

  /** Ordered oldest-first, which is what the tank-to-tank calculation needs. */
  async pointsForVehicle(vehicleId: string, from?: Date, to?: Date) {
    return prisma.vehicleFuelLog.findMany({
      where: {
        vehicleId,
        ...(from || to
          ? { loggedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      select: { mileage: true, litres: true, totalCost: true, loggedAt: true },
      orderBy: { loggedAt: "asc" },
    });
  },

  async sumCost(propertyId: string, from: Date, to: Date, vehicleId?: string) {
    const result = await prisma.vehicleFuelLog.aggregate({
      where: {
        loggedAt: { gte: from, lte: to },
        ...(vehicleId ? { vehicleId } : { vehicle: { propertyId } }),
      },
      _sum: { totalCost: true, litres: true },
      _count: { _all: true },
    });
    return {
      total: result._sum.totalCost ? Number(result._sum.totalCost) : 0,
      litres: result._sum.litres ? Number(result._sum.litres) : 0,
      count: result._count._all,
    };
  },
};

export const DocumentRepository = {
  async list(filters: {
    propertyId?: string;
    vehicleId?: string;
    includeArchived?: boolean;
  }): Promise<DocumentRow[]> {
    return prisma.vehicleDocument.findMany({
      where: {
        ...(filters.includeArchived ? {} : { deletedAt: null }),
        ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters.propertyId
          ? { vehicle: { propertyId: filters.propertyId, deletedAt: null } }
          : {}),
      },
      select: documentSelect,
      orderBy: { expiryDate: "asc" },
    });
  },

  async findById(id: string, tx?: FleetTx): Promise<DocumentRow | null> {
    return (tx ?? prisma).vehicleDocument.findUnique({
      where: { id },
      select: documentSelect,
    });
  },

  async create(
    data: Prisma.VehicleDocumentUncheckedCreateInput,
    tx?: FleetTx
  ): Promise<DocumentRow> {
    return (tx ?? prisma).vehicleDocument.create({ data, select: documentSelect });
  },

  async update(
    id: string,
    data: Prisma.VehicleDocumentUpdateInput,
    tx?: FleetTx
  ): Promise<DocumentRow> {
    return (tx ?? prisma).vehicleDocument.update({
      where: { id },
      data,
      select: documentSelect,
    });
  },

  async archive(id: string, tx?: FleetTx): Promise<DocumentRow> {
    return (tx ?? prisma).vehicleDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: documentSelect,
    });
  },

  /**
   * Documents that have already expired for the given vehicles. Absence of a
   * document is deliberately NOT treated as expiry — we cannot claim a vehicle
   * is uninsured just because nobody entered the certificate.
   */
  async findExpired(vehicleIds: string[], asOf: Date, tx?: FleetTx) {
    if (vehicleIds.length === 0) return [];
    return (tx ?? prisma).vehicleDocument.findMany({
      where: {
        deletedAt: null,
        vehicleId: { in: vehicleIds },
        expiryDate: { lt: asOf },
      },
      select: { id: true, vehicleId: true, type: true, expiryDate: true, documentNumber: true },
    });
  },
};
