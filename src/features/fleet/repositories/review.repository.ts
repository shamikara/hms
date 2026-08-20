import prisma from "@/core/db/prisma";
import { Prisma } from "@prisma/client";
import type { FleetTx } from "./vehicle.repository";

export const reviewSelect = {
  id: true,
  tripId: true,
  guestId: true,
  vehicleId: true,
  driverId: true,
  overallRating: true,
  comment: true,
  driverOverall: true,
  driverSafety: true,
  driverPunctuality: true,
  driverProfessionalism: true,
  driverCommunication: true,
  driverKnowledge: true,
  vehicleOverall: true,
  vehicleCleanliness: true,
  vehicleComfort: true,
  vehicleCondition: true,
  vehicleRideQuality: true,
  vehicleSuitability: true,
  submittedAt: true,
  guest: { select: { id: true, firstName: true, lastName: true } },
  trip: {
    select: {
      id: true,
      destination: true,
      tripType: true,
      scheduledStart: true,
      actualReturn: true,
    },
  },
} satisfies Prisma.SafariReviewSelect;

export type ReviewRow = Prisma.SafariReviewGetPayload<{ select: typeof reviewSelect }>;

/** The rating columns needed to recompute an entity's aggregates. */
const vehicleAggregateSelect = {
  vehicleOverall: true,
  vehicleCleanliness: true,
  vehicleComfort: true,
  vehicleCondition: true,
  vehicleRideQuality: true,
  vehicleSuitability: true,
  submittedAt: true,
} satisfies Prisma.SafariReviewSelect;

const driverAggregateSelect = {
  driverOverall: true,
  driverSafety: true,
  driverPunctuality: true,
  driverProfessionalism: true,
  driverCommunication: true,
  driverKnowledge: true,
  submittedAt: true,
} satisfies Prisma.SafariReviewSelect;

export type VehicleRatingSample = Prisma.SafariReviewGetPayload<{
  select: typeof vehicleAggregateSelect;
}>;
export type DriverRatingSample = Prisma.SafariReviewGetPayload<{
  select: typeof driverAggregateSelect;
}>;

export const ReviewRepository = {
  async findByTripId(tripId: string, tx?: FleetTx): Promise<ReviewRow | null> {
    return (tx ?? prisma).safariReview.findUnique({
      where: { tripId },
      select: reviewSelect,
    });
  },

  async create(
    data: Prisma.SafariReviewUncheckedCreateInput,
    tx?: FleetTx
  ): Promise<ReviewRow> {
    return (tx ?? prisma).safariReview.create({ data, select: reviewSelect });
  },

  async listForVehicle(vehicleId: string, take = 50): Promise<ReviewRow[]> {
    return prisma.safariReview.findMany({
      where: { vehicleId },
      select: reviewSelect,
      orderBy: { submittedAt: "desc" },
      take,
    });
  },

  async listForDriver(driverId: string, take = 50): Promise<ReviewRow[]> {
    return prisma.safariReview.findMany({
      where: { driverId },
      select: reviewSelect,
      orderBy: { submittedAt: "desc" },
      take,
    });
  },

  /** All vehicle-facing ratings for one vehicle, newest first (trend + averages). */
  async vehicleSamples(vehicleId: string, tx?: FleetTx): Promise<VehicleRatingSample[]> {
    return (tx ?? prisma).safariReview.findMany({
      where: { vehicleId },
      select: vehicleAggregateSelect,
      orderBy: { submittedAt: "desc" },
    });
  },

  /** All driver-facing ratings for one driver, newest first (trend + averages). */
  async driverSamples(driverId: string, tx?: FleetTx): Promise<DriverRatingSample[]> {
    return (tx ?? prisma).safariReview.findMany({
      where: { driverId },
      select: driverAggregateSelect,
      orderBy: { submittedAt: "desc" },
    });
  },

  /**
   * Population mean `C` for the Bayesian prior. Computed over every review in
   * the database rather than per property: the prior describes "what a safari
   * rating normally looks like", and a single property rarely has enough
   * reviews to estimate that stably.
   *
   * Returns null when there are no reviews at all, so the caller falls back to
   * the neutral prior instead of dividing by zero.
   */
  async populationMeans(
    tx?: FleetTx
  ): Promise<{ vehicleMean: number | null; driverMean: number | null; count: number }> {
    const result = await (tx ?? prisma).safariReview.aggregate({
      _avg: { vehicleOverall: true, driverOverall: true },
      _count: { _all: true },
    });
    return {
      vehicleMean: result._avg.vehicleOverall ?? null,
      driverMean: result._avg.driverOverall ?? null,
      count: result._count._all,
    };
  },

  async countForProperty(propertyId: string): Promise<number> {
    return prisma.safariReview.count({ where: { trip: { propertyId } } });
  },

  async fleetAverage(propertyId: string): Promise<number | null> {
    const result = await prisma.safariReview.aggregate({
      where: { trip: { propertyId } },
      _avg: { overallRating: true },
    });
    return result._avg.overallRating ?? null;
  },
};
