import prisma from "@/core/db/prisma";
import { Prisma, SafariTripStatus } from "@prisma/client";
import { AppError } from "@/core/types/Result";
import { AuditLogger } from "@/core/audit/AuditLogger";
import { Logger } from "@/core/logging/Logger";
import { ReviewRepository, type ReviewRow } from "../repositories/review.repository";
import { RatingService } from "./rating.service";
import { AlertService } from "./alert.service";
import type { SafariReviewSubmitValues } from "../validations/fleet.schema";

/**
 * Guest reviews.
 *
 * Eligibility is deliberately strict — a review is a reputational record, so it
 * has to be earned:
 *   1. the trip must exist and be COMPLETED (no rating a drive that has not
 *      happened);
 *   2. the trip must have a guest attached (internal/repositioning runs are not
 *      reviewable);
 *   3. the caller's own `GuestProfile` must be that guest;
 *   4. one review per trip, enforced by a unique index as well as this check.
 *
 * There is no "rate this driver" endpoint that takes a driver id: the only way
 * to create a rating is through a trip the caller actually travelled on.
 */

const logger = new Logger("FleetReviewService");

export interface ReviewableTrip {
  id: string;
  destination: string;
  tripType: string;
  scheduledStart: Date;
  actualReturn: Date | null;
  vehicle: { id: string; plateNumber: string; displayName: string | null };
  driver: { id: string; name: string };
  guideName: string | null;
  hasReview: boolean;
}

export interface ReviewEligibility {
  eligible: boolean;
  reason: string;
  trip: ReviewableTrip | null;
}

function driverName(driver: {
  employee: { firstName: string; lastName: string };
}): string {
  return `${driver.employee.firstName} ${driver.employee.lastName}`;
}

export const ReviewService = {
  /** Completed trips this guest may still review, plus ones already reviewed. */
  async listGuestTrips(guestProfileId: string): Promise<ReviewableTrip[]> {
    const trips = await prisma.safariTrip.findMany({
      where: { guestId: guestProfileId, status: SafariTripStatus.COMPLETED },
      select: {
        id: true,
        destination: true,
        tripType: true,
        scheduledStart: true,
        actualReturn: true,
        vehicle: { select: { id: true, plateNumber: true, displayName: true } },
        driver: {
          select: { id: true, employee: { select: { firstName: true, lastName: true } } },
        },
        guide: { select: { firstName: true, lastName: true } },
        review: { select: { id: true } },
      },
      orderBy: { scheduledStart: "desc" },
      take: 50,
    });

    return trips.map((trip) => ({
      id: trip.id,
      destination: trip.destination,
      tripType: trip.tripType,
      scheduledStart: trip.scheduledStart,
      actualReturn: trip.actualReturn,
      vehicle: trip.vehicle,
      driver: { id: trip.driver.id, name: driverName(trip.driver) },
      guideName: trip.guide ? `${trip.guide.firstName} ${trip.guide.lastName}` : null,
      hasReview: trip.review !== null,
    }));
  },

  /**
   * Checks whether this guest may review this trip, returning a reason rather
   * than throwing so the page can render an explanation.
   */
  async checkEligibility(
    tripId: string,
    guestProfileId: string
  ): Promise<ReviewEligibility> {
    const trip = await prisma.safariTrip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        guestId: true,
        status: true,
        destination: true,
        tripType: true,
        scheduledStart: true,
        actualReturn: true,
        vehicle: { select: { id: true, plateNumber: true, displayName: true } },
        driver: {
          select: { id: true, employee: { select: { firstName: true, lastName: true } } },
        },
        guide: { select: { firstName: true, lastName: true } },
        review: { select: { id: true } },
      },
    });

    if (!trip) {
      return { eligible: false, reason: "That safari could not be found.", trip: null };
    }

    const shaped: ReviewableTrip = {
      id: trip.id,
      destination: trip.destination,
      tripType: trip.tripType,
      scheduledStart: trip.scheduledStart,
      actualReturn: trip.actualReturn,
      vehicle: trip.vehicle,
      driver: { id: trip.driver.id, name: driverName(trip.driver) },
      guideName: trip.guide ? `${trip.guide.firstName} ${trip.guide.lastName}` : null,
      hasReview: trip.review !== null,
    };

    if (trip.guestId === null || trip.guestId !== guestProfileId) {
      // Same message either way: do not leak whose trip it is.
      return {
        eligible: false,
        reason: "This safari is not linked to your guest profile.",
        trip: null,
      };
    }
    if (trip.status !== SafariTripStatus.COMPLETED) {
      return {
        eligible: false,
        reason: "You can leave a review once the safari has been completed.",
        trip: shaped,
      };
    }
    if (trip.review !== null) {
      return {
        eligible: false,
        reason: "You have already reviewed this safari. Thank you!",
        trip: shaped,
      };
    }

    return { eligible: true, reason: "", trip: shaped };
  },

  /**
   * Writes the review and refreshes the vehicle and driver rating aggregates in
   * one transaction, so a review can never exist without being counted.
   *
   * Alert evaluation runs after the commit: it is advisory, and a failure there
   * must not lose the guest's review.
   */
  async submit(
    input: SafariReviewSubmitValues,
    guestProfileId: string,
    userId: string
  ): Promise<ReviewRow> {
    const eligibility = await this.checkEligibility(input.tripId, guestProfileId);
    if (!eligibility.eligible) {
      throw new AppError("NOT_ELIGIBLE", eligibility.reason);
    }

    let created: ReviewRow;
    try {
      created = await prisma.$transaction(async (tx) => {
        // Re-read inside the transaction: the trip's vehicle/driver are copied
        // onto the review, and we want the values as of the commit.
        const trip = await tx.safariTrip.findUnique({
          where: { id: input.tripId },
          select: {
            id: true,
            guestId: true,
            status: true,
            vehicleId: true,
            driverId: true,
            propertyId: true,
          },
        });

        if (!trip || trip.guestId !== guestProfileId) {
          throw new AppError("NOT_ELIGIBLE", "This safari is not linked to your profile.");
        }
        if (trip.status !== SafariTripStatus.COMPLETED) {
          throw new AppError(
            "NOT_ELIGIBLE",
            "You can leave a review once the safari has been completed."
          );
        }

        const review = await ReviewRepository.create(
          {
            tripId: trip.id,
            guestId: guestProfileId,
            vehicleId: trip.vehicleId,
            driverId: trip.driverId,
            overallRating: input.overallRating,
            comment: input.comment ?? null,
            driverOverall: input.driverOverall,
            driverSafety: input.driverSafety,
            driverPunctuality: input.driverPunctuality,
            driverProfessionalism: input.driverProfessionalism,
            driverCommunication: input.driverCommunication,
            driverKnowledge: input.driverKnowledge ?? null,
            vehicleOverall: input.vehicleOverall,
            vehicleCleanliness: input.vehicleCleanliness,
            vehicleComfort: input.vehicleComfort,
            vehicleCondition: input.vehicleCondition,
            vehicleRideQuality: input.vehicleRideQuality,
            vehicleSuitability: input.vehicleSuitability,
          },
          tx
        );

        await RatingService.recomputeVehicleRatings(trip.vehicleId, tx);
        await RatingService.recomputeDriverRatings(trip.driverId, tx);

        await AuditLogger.log(tx, userId, "CREATE", "SafariReview", review.id, null, {
          tripId: review.tripId,
          overallRating: review.overallRating,
          vehicleId: review.vehicleId,
          driverId: review.driverId,
        });

        return review;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError(
          "DUPLICATE_REVIEW",
          "A review for this safari already exists."
        );
      }
      throw error;
    }

    try {
      await AlertService.evaluateRatingAlerts(created.vehicleId, created.driverId);
    } catch (error) {
      logger.warn("Rating alert evaluation failed after review submission", {
        reviewId: created.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return created;
  },

  async listForVehicle(vehicleId: string, take = 25): Promise<ReviewRow[]> {
    return ReviewRepository.listForVehicle(vehicleId, take);
  },

  async listForDriver(driverId: string, take = 25): Promise<ReviewRow[]> {
    return ReviewRepository.listForDriver(driverId, take);
  },
};
