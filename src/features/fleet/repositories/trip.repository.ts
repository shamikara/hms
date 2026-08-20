import prisma from "@/core/db/prisma";
import { MaintenanceStatus, Prisma, SafariTripStatus } from "@prisma/client";
import type { FleetTx } from "./vehicle.repository";

/**
 * Trip reads and — importantly — occupancy reads.
 *
 * Two tables can make a vehicle or a driver busy:
 *   1. `SafariTrip`   — the fleet module's own operational record.
 *   2. `SafariSchedule` — the pre-existing "scheduled game drive" table, still
 *      written by the original SafariService.
 *
 * Availability must consider both, otherwise a vehicle booked through the older
 * flow would look free here. Schedules that already have a linked trip are
 * skipped so the same occupancy is not counted twice.
 *
 * Overlap test used everywhere: `startA < endB AND endA > startB`
 * (half-open intervals, so a trip ending at 12:00 and one starting at 12:00 do
 * not conflict).
 */

/** Statuses that still occupy a vehicle/driver. Only CANCELLED frees the slot. */
export const OCCUPYING_TRIP_STATUSES: SafariTripStatus[] = [
  SafariTripStatus.SCHEDULED,
  SafariTripStatus.CONFIRMED,
  SafariTripStatus.IN_PROGRESS,
  SafariTripStatus.COMPLETED,
];

export const tripSelect = {
  id: true,
  propertyId: true,
  scheduleId: true,
  bookingId: true,
  guestId: true,
  vehicleId: true,
  driverId: true,
  guideId: true,
  routeId: true,
  destination: true,
  tripType: true,
  status: true,
  scheduledStart: true,
  scheduledEnd: true,
  actualDeparture: true,
  actualReturn: true,
  guestCount: true,
  startMileage: true,
  endMileage: true,
  distanceKm: true,
  startFuelLevel: true,
  endFuelLevel: true,
  operationalNotes: true,
  incidentNotes: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: {
      id: true,
      plateNumber: true,
      displayName: true,
      capacity: true,
      safariCapacity: true,
      currentMileage: true,
      status: true,
    },
  },
  driver: {
    select: {
      id: true,
      licenseNumber: true,
      ratingAvg: true,
      ratingCount: true,
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  guide: { select: { id: true, firstName: true, lastName: true } },
  route: { select: { id: true, name: true, durationMin: true } },
  guest: { select: { id: true, firstName: true, lastName: true, email: true } },
  review: { select: { id: true, overallRating: true, submittedAt: true } },
} satisfies Prisma.SafariTripSelect;

export type TripRow = Prisma.SafariTripGetPayload<{ select: typeof tripSelect }>;

export interface OccupancyQuery {
  start: Date;
  end: Date;
  vehicleIds?: string[];
  /** `SafariDriver` ids. */
  driverIds?: string[];
  /** `Employee` ids acting as guide. */
  guideIds?: string[];
  /** Ignore this trip — used when rescheduling it. */
  excludeTripId?: string;
}

export interface TripListFilters {
  propertyId?: string;
  status?: SafariTripStatus;
  statuses?: SafariTripStatus[];
  vehicleId?: string;
  driverId?: string;
  guestId?: string;
  from?: Date;
  to?: Date;
  take?: number;
}

function overlapWhere(start: Date, end: Date) {
  return { scheduledStart: { lt: end }, scheduledEnd: { gt: start } };
}

export const TripRepository = {
  /** Trips that overlap the window for any of the supplied vehicles/drivers/guides. */
  async findConflictingTrips(query: OccupancyQuery, tx?: FleetTx): Promise<TripRow[]> {
    const subjects: Prisma.SafariTripWhereInput[] = [];
    if (query.vehicleIds?.length) subjects.push({ vehicleId: { in: query.vehicleIds } });
    if (query.driverIds?.length) subjects.push({ driverId: { in: query.driverIds } });
    if (query.guideIds?.length) subjects.push({ guideId: { in: query.guideIds } });
    if (subjects.length === 0) return [];

    return (tx ?? prisma).safariTrip.findMany({
      where: {
        status: { in: OCCUPYING_TRIP_STATUSES },
        ...(query.excludeTripId ? { id: { not: query.excludeTripId } } : {}),
        ...overlapWhere(query.start, query.end),
        OR: subjects,
      },
      select: tripSelect,
      orderBy: { scheduledStart: "asc" },
    });
  },

  /**
   * Legacy `SafariSchedule` rows that overlap the window. Schedules already
   * dispatched as a trip are excluded (`trip: null`) so the same occupancy is
   * not double counted.
   *
   * Note `SafariSchedule.driverId` points at `Employee`, while
   * `SafariTrip.driverId` points at `SafariDriver` — callers must pass employee
   * ids in `driverEmployeeIds`.
   */
  async findConflictingSchedules(
    query: {
      start: Date;
      end: Date;
      vehicleIds?: string[];
      driverEmployeeIds?: string[];
      guideIds?: string[];
    },
    tx?: FleetTx
  ) {
    const subjects: Prisma.SafariScheduleWhereInput[] = [];
    if (query.vehicleIds?.length) subjects.push({ vehicleId: { in: query.vehicleIds } });
    if (query.driverEmployeeIds?.length)
      subjects.push({ driverId: { in: query.driverEmployeeIds } });
    if (query.guideIds?.length) subjects.push({ guideId: { in: query.guideIds } });
    if (subjects.length === 0) return [];

    return (tx ?? prisma).safariSchedule.findMany({
      where: {
        trip: null,
        startTime: { lt: query.end },
        endTime: { gt: query.start },
        OR: subjects,
      },
      select: {
        id: true,
        vehicleId: true,
        driverId: true,
        guideId: true,
        startTime: true,
        endTime: true,
        vehicle: { select: { plateNumber: true } },
        driver: { select: { firstName: true, lastName: true } },
        guide: { select: { firstName: true, lastName: true } },
        route: { select: { name: true } },
      },
      orderBy: { startTime: "asc" },
    });
  },

  /**
   * Vehicles blocked by maintenance during the window.
   *
   * A maintenance job is a point-in-time record, not a range, so:
   *   - status IN_PROGRESS blocks the vehicle outright (it is in the workshop
   *     right now, whatever the trip dates say);
   *   - status SCHEDULED blocks the vehicle when the booked service date falls
   *     inside the trip window.
   */
  async findMaintenanceBlocks(
    vehicleIds: string[],
    start: Date,
    end: Date,
    tx?: FleetTx
  ) {
    if (vehicleIds.length === 0) return [];
    return (tx ?? prisma).vehicleMaintenance.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        OR: [
          { status: MaintenanceStatus.IN_PROGRESS },
          {
            status: MaintenanceStatus.SCHEDULED,
            serviceDate: { gte: start, lt: end },
          },
        ],
      },
      select: {
        id: true,
        vehicleId: true,
        type: true,
        status: true,
        serviceDate: true,
        description: true,
      },
    });
  },

  async findById(id: string, tx?: FleetTx): Promise<TripRow | null> {
    return (tx ?? prisma).safariTrip.findUnique({ where: { id }, select: tripSelect });
  },

  async list(filters: TripListFilters): Promise<TripRow[]> {
    const statuses = filters.statuses ?? (filters.status ? [filters.status] : undefined);
    return prisma.safariTrip.findMany({
      where: {
        ...(filters.propertyId ? { propertyId: filters.propertyId } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters.driverId ? { driverId: filters.driverId } : {}),
        ...(filters.guestId ? { guestId: filters.guestId } : {}),
        ...(filters.from || filters.to
          ? {
              scheduledStart: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      select: tripSelect,
      orderBy: { scheduledStart: "asc" },
      take: filters.take ?? 100,
    });
  },

  async create(
    data: Prisma.SafariTripUncheckedCreateInput,
    tx?: FleetTx
  ): Promise<TripRow> {
    return (tx ?? prisma).safariTrip.create({ data, select: tripSelect });
  },

  /**
   * Optimistic-locked update. Returns null when the row moved underneath the
   * caller (version mismatch), which the service turns into a concurrency error.
   */
  async updateWithVersion(
    id: string,
    expectedVersion: number,
    data: Prisma.SafariTripUncheckedUpdateManyInput,
    tx?: FleetTx
  ): Promise<TripRow | null> {
    const client = tx ?? prisma;
    const result = await client.safariTrip.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count === 0) return null;
    return client.safariTrip.findUnique({ where: { id }, select: tripSelect });
  },

  async countByStatus(propertyId: string, from: Date, to: Date) {
    const grouped = await prisma.safariTrip.groupBy({
      by: ["status"],
      where: { propertyId, scheduledStart: { gte: from, lte: to } },
      _count: { _all: true },
    });
    const counts = Object.fromEntries(
      Object.values(SafariTripStatus).map((s) => [s, 0])
    ) as Record<SafariTripStatus, number>;
    for (const row of grouped) counts[row.status] = row._count._all;
    return counts;
  },

  /** Trips currently out (used by the dashboard "active safaris" tile). */
  async countActive(propertyId: string): Promise<number> {
    return prisma.safariTrip.count({
      where: { propertyId, status: SafariTripStatus.IN_PROGRESS },
    });
  },

  /**
   * Future game-drive schedules that have bookings but no operational trip yet.
   * These are the rows a dispatcher can pull into the fleet module.
   */
  async listDispatchableSchedules(propertyId: string, after: Date, take = 25) {
    return prisma.safariSchedule.findMany({
      where: {
        trip: null,
        endTime: { gt: after },
        route: { propertyId },
        bookings: { some: {} },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        vehicle: { select: { id: true, plateNumber: true, displayName: true } },
        route: { select: { id: true, name: true } },
        guide: { select: { id: true, firstName: true, lastName: true } },
        driver: { select: { id: true, firstName: true, lastName: true } },
        bookings: { select: { id: true, guestCount: true } },
      },
      orderBy: { startTime: "asc" },
      take,
    });
  },

  async countUpcoming(propertyId: string, after: Date): Promise<number> {
    return prisma.safariTrip.count({
      where: {
        propertyId,
        status: { in: [SafariTripStatus.SCHEDULED, SafariTripStatus.CONFIRMED] },
        scheduledStart: { gt: after },
      },
    });
  },
};
