import prisma from "@/core/db/prisma";
import { ReviewRepository } from "../repositories/review.repository";
import type { FleetTx } from "../repositories/vehicle.repository";
import {
  average,
  bayesianScore,
  calculateTrend,
  findCategoryWeaknesses,
  isLowRated,
  MIN_REVIEWS_FOR_INSIGHT,
  type CategoryWeakness,
  type TrendResult,
} from "../lib/rating";

/**
 * Turns raw reviews into the aggregates the fleet UI ranks and charts on.
 *
 * The aggregate columns on `Vehicle` / `SafariDriver` are a cache, not a second
 * source of truth: they are always recomputed from the full review set inside
 * the same transaction that writes a review, so they cannot drift.
 *
 * The maths itself lives in `../lib/rating.ts` and is documented there.
 */

export interface RatingProfile {
  count: number;
  overallAverage: number | null;
  /** Confidence-adjusted score used for ranking. */
  bayesian: number | null;
  categories: Record<string, number | null>;
  trend: TrendResult;
  weaknesses: CategoryWeakness[];
  isLowRated: boolean;
  /** True when there is enough data to draw any conclusion at all. */
  hasEnoughData: boolean;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export const RatingService = {
  /**
   * Recomputes and stores a vehicle's rating aggregates. Must be called inside
   * the review transaction so the cache and the review land together.
   */
  async recomputeVehicleRatings(vehicleId: string, tx?: FleetTx): Promise<void> {
    const client = tx ?? prisma;
    const [samples, population] = await Promise.all([
      ReviewRepository.vehicleSamples(vehicleId, tx),
      ReviewRepository.populationMeans(tx),
    ]);

    if (samples.length === 0) {
      await client.vehicle.update({
        where: { id: vehicleId },
        data: {
          ratingCount: 0,
          ratingAvg: null,
          ratingBayesian: null,
          ratingCleanlinessAvg: null,
          ratingComfortAvg: null,
          ratingConditionAvg: null,
          ratingRideQualityAvg: null,
          ratingSuitabilityAvg: null,
          ratingsUpdatedAt: new Date(),
        },
      });
      return;
    }

    const overall = average(samples.map((s) => s.vehicleOverall));

    await client.vehicle.update({
      where: { id: vehicleId },
      data: {
        ratingCount: samples.length,
        ratingAvg: overall,
        ratingBayesian: bayesianScore(samples.length, overall, population.vehicleMean),
        ratingCleanlinessAvg: average(samples.map((s) => s.vehicleCleanliness)),
        ratingComfortAvg: average(samples.map((s) => s.vehicleComfort)),
        ratingConditionAvg: average(samples.map((s) => s.vehicleCondition)),
        ratingRideQualityAvg: average(samples.map((s) => s.vehicleRideQuality)),
        ratingSuitabilityAvg: average(samples.map((s) => s.vehicleSuitability)),
        ratingsUpdatedAt: new Date(),
      },
    });
  },

  /** Recomputes and stores a driver's rating aggregates. */
  async recomputeDriverRatings(driverId: string, tx?: FleetTx): Promise<void> {
    const client = tx ?? prisma;
    const [samples, population] = await Promise.all([
      ReviewRepository.driverSamples(driverId, tx),
      ReviewRepository.populationMeans(tx),
    ]);

    if (samples.length === 0) {
      await client.safariDriver.update({
        where: { id: driverId },
        data: {
          ratingCount: 0,
          ratingAvg: null,
          ratingBayesian: null,
          ratingSafetyAvg: null,
          ratingPunctualityAvg: null,
          ratingProfessionalismAvg: null,
          ratingCommunicationAvg: null,
          ratingKnowledgeAvg: null,
          ratingsUpdatedAt: new Date(),
        },
      });
      return;
    }

    const overall = average(samples.map((s) => s.driverOverall));

    await client.safariDriver.update({
      where: { id: driverId },
      data: {
        ratingCount: samples.length,
        ratingAvg: overall,
        ratingBayesian: bayesianScore(samples.length, overall, population.driverMean),
        ratingSafetyAvg: average(samples.map((s) => s.driverSafety)),
        ratingPunctualityAvg: average(samples.map((s) => s.driverPunctuality)),
        ratingProfessionalismAvg: average(samples.map((s) => s.driverProfessionalism)),
        ratingCommunicationAvg: average(samples.map((s) => s.driverCommunication)),
        // driverKnowledge is optional on the form; average() ignores the nulls.
        ratingKnowledgeAvg: average(samples.map((s) => s.driverKnowledge)),
        ratingsUpdatedAt: new Date(),
      },
    });
  },

  /**
   * Full quality picture for one vehicle: averages, confidence-adjusted score,
   * trend across the two most recent review windows, and which categories are
   * dragging it down. Every field is null/empty when the sample is too small —
   * no insight is invented.
   */
  async getVehicleRatingProfile(vehicleId: string): Promise<RatingProfile> {
    const [samples, population] = await Promise.all([
      ReviewRepository.vehicleSamples(vehicleId),
      ReviewRepository.populationMeans(),
    ]);

    const overall = average(samples.map((s) => s.vehicleOverall));
    const categories = {
      Cleanliness: average(samples.map((s) => s.vehicleCleanliness)),
      Comfort: average(samples.map((s) => s.vehicleComfort)),
      Condition: average(samples.map((s) => s.vehicleCondition)),
      "Ride quality": average(samples.map((s) => s.vehicleRideQuality)),
      "Safari suitability": average(samples.map((s) => s.vehicleSuitability)),
    };
    const bayesian = bayesianScore(samples.length, overall, population.vehicleMean);

    return {
      count: samples.length,
      overallAverage: overall,
      bayesian,
      categories,
      trend: calculateTrend(samples.map((s) => s.vehicleOverall)),
      weaknesses: findCategoryWeaknesses(samples.length, overall, categories),
      isLowRated: isLowRated(samples.length, bayesian),
      hasEnoughData: samples.length >= MIN_REVIEWS_FOR_INSIGHT,
    };
  },

  /** Full quality picture for one driver. */
  async getDriverRatingProfile(driverId: string): Promise<RatingProfile> {
    const [samples, population] = await Promise.all([
      ReviewRepository.driverSamples(driverId),
      ReviewRepository.populationMeans(),
    ]);

    const overall = average(samples.map((s) => s.driverOverall));
    const categories = {
      "Driving safety": average(samples.map((s) => s.driverSafety)),
      Punctuality: average(samples.map((s) => s.driverPunctuality)),
      Professionalism: average(samples.map((s) => s.driverProfessionalism)),
      Communication: average(samples.map((s) => s.driverCommunication)),
      "Safari knowledge": average(samples.map((s) => s.driverKnowledge)),
    };
    const bayesian = bayesianScore(samples.length, overall, population.driverMean);

    return {
      count: samples.length,
      overallAverage: overall,
      bayesian,
      categories,
      trend: calculateTrend(samples.map((s) => s.driverOverall)),
      weaknesses: findCategoryWeaknesses(samples.length, overall, categories),
      isLowRated: isLowRated(samples.length, bayesian),
      hasEnoughData: samples.length >= MIN_REVIEWS_FOR_INSIGHT,
    };
  },

  /**
   * Converts the stored Decimal aggregates on a row into plain numbers.
   * Kept here so every caller reads the cache the same way.
   */
  readCachedAggregates(row: {
    ratingCount: number;
    ratingAvg: unknown;
    ratingBayesian: unknown;
  }): { count: number; average: number | null; bayesian: number | null } {
    return {
      count: row.ratingCount,
      average: toNumber(row.ratingAvg),
      bayesian: toNumber(row.ratingBayesian),
    };
  },
};
