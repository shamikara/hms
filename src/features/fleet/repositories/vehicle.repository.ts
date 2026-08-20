import prisma from "@/core/db/prisma";
import { Prisma, VehicleStatus } from "@prisma/client";

export type FleetTx = Prisma.TransactionClient;

/** Columns the fleet UI needs for a vehicle row. */
export const vehicleListSelect = {
  id: true,
  propertyId: true,
  plateNumber: true,
  displayName: true,
  make: true,
  model: true,
  vehicleType: true,
  capacity: true,
  safariCapacity: true,
  fuelType: true,
  ownershipType: true,
  purchaseYear: true,
  currentMileage: true,
  status: true,
  isActive: true,
  notes: true,
  imageUrls: true,
  ratingCount: true,
  ratingAvg: true,
  ratingBayesian: true,
  ratingCleanlinessAvg: true,
  ratingComfortAvg: true,
  ratingConditionAvg: true,
  ratingRideQualityAvg: true,
  ratingSuitabilityAvg: true,
  ratingsUpdatedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.VehicleSelect;

export type VehicleRow = Prisma.VehicleGetPayload<{ select: typeof vehicleListSelect }>;

export interface VehicleListFilters {
  propertyId?: string;
  status?: VehicleStatus;
  /** Defaults to active-only. Pass true to include archived vehicles. */
  includeArchived?: boolean;
  search?: string;
}

export const VehicleRepository = {
  async list(filters: VehicleListFilters): Promise<VehicleRow[]> {
    const where: Prisma.VehicleWhereInput = {
      ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.includeArchived ? {} : { deletedAt: null }),
      ...(filters.search
        ? {
            OR: [
              { plateNumber: { contains: filters.search, mode: "insensitive" } },
              { displayName: { contains: filters.search, mode: "insensitive" } },
              { make: { contains: filters.search, mode: "insensitive" } },
              { model: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return prisma.vehicle.findMany({
      where,
      select: vehicleListSelect,
      orderBy: [{ deletedAt: "asc" }, { plateNumber: "asc" }],
    });
  },

  async findById(id: string): Promise<VehicleRow | null> {
    return prisma.vehicle.findUnique({ where: { id }, select: vehicleListSelect });
  },

  async create(data: Prisma.VehicleUncheckedCreateInput, tx?: FleetTx): Promise<VehicleRow> {
    return (tx ?? prisma).vehicle.create({ data, select: vehicleListSelect });
  },

  async update(
    id: string,
    data: Prisma.VehicleUpdateInput,
    tx?: FleetTx
  ): Promise<VehicleRow> {
    return (tx ?? prisma).vehicle.update({
      where: { id },
      data,
      select: vehicleListSelect,
    });
  },

  /** Soft delete: historical trips, reviews and costs must survive. */
  async archive(id: string, tx?: FleetTx): Promise<VehicleRow> {
    return (tx ?? prisma).vehicle.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        status: VehicleStatus.OUT_OF_SERVICE,
      },
      select: vehicleListSelect,
    });
  },

  async restore(id: string, tx?: FleetTx): Promise<VehicleRow> {
    return (tx ?? prisma).vehicle.update({
      where: { id },
      data: { deletedAt: null, isActive: true, status: VehicleStatus.AVAILABLE },
      select: vehicleListSelect,
    });
  },

  async countByStatus(propertyId: string): Promise<Record<VehicleStatus, number>> {
    const grouped = await prisma.vehicle.groupBy({
      by: ["status"],
      where: { propertyId, deletedAt: null },
      _count: { _all: true },
    });

    const counts = Object.fromEntries(
      Object.values(VehicleStatus).map((status) => [status, 0])
    ) as Record<VehicleStatus, number>;

    for (const row of grouped) {
      counts[row.status] = row._count._all;
    }
    return counts;
  },

  /**
   * Advances the odometer, but never backwards: a trip logged out of order or a
   * mistyped fuel reading must not rewind the vehicle's mileage.
   */
  async advanceMileage(id: string, mileage: number, tx?: FleetTx): Promise<void> {
    await (tx ?? prisma).vehicle.updateMany({
      where: { id, currentMileage: { lt: mileage } },
      data: { currentMileage: mileage },
    });
  },
};
