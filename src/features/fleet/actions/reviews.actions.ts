"use server";

import { revalidatePath } from "next/cache";
import {
  getFleetActor,
  getGuestProfileForSession,
  requireFleetPermission,
  type FleetPermission,
} from "../lib/authz";
import {
  actionError,
  actionOk,
  isConnectivityError,
  type FleetActionResult,
} from "../lib/actionResult";
import { SafariReviewSubmitSchema } from "../validations/fleet.schema";
import { ReviewService, type ReviewEligibility, type ReviewableTrip } from "../services/review.service";
import { RatingService, type RatingProfile } from "../services/rating.service";

/**
 * Review actions.
 *
 * Guest-facing reads and the submission itself authenticate as a *guest*, not a
 * staff member: the caller must own the `GuestProfile` attached to the trip.
 * Staff-facing reads (aggregates on the fleet pages) use the fleet permissions.
 */

export async function listMyReviewableTripsAction(): Promise<
  FleetActionResult<{ trips: ReviewableTrip[] }>
> {
  try {
    const guest = await getGuestProfileForSession();
    if (!guest) {
      return {
        success: false,
        error: "Sign in with your guest account to review a safari.",
        code: "UNAUTHENTICATED",
      };
    }
    const trips = await ReviewService.listGuestTrips(guest.guestProfileId);
    return actionOk({ trips });
  } catch (error) {
    if (isConnectivityError(error)) {
      return {
        success: false,
        error: "We cannot load your safaris right now. Please try again shortly.",
        code: "DB_UNAVAILABLE",
      };
    }
    return actionError(error, "listMyReviewableTripsAction");
  }
}

export async function checkReviewEligibilityAction(
  tripId: string
): Promise<FleetActionResult<ReviewEligibility>> {
  try {
    const guest = await getGuestProfileForSession();
    if (!guest) {
      return {
        success: false,
        error: "Sign in with your guest account to review a safari.",
        code: "UNAUTHENTICATED",
      };
    }
    const eligibility = await ReviewService.checkEligibility(tripId, guest.guestProfileId);
    return actionOk(eligibility);
  } catch (error) {
    if (isConnectivityError(error)) {
      return {
        success: false,
        error: "We cannot load that safari right now. Please try again shortly.",
        code: "DB_UNAVAILABLE",
      };
    }
    return actionError(error, "checkReviewEligibilityAction");
  }
}

/**
 * The only way a rating enters the system. There is deliberately no action that
 * accepts a bare driver or vehicle id.
 */
export async function submitSafariReviewAction(
  input: unknown
): Promise<FleetActionResult<{ reviewId: string }>> {
  try {
    const guest = await getGuestProfileForSession();
    if (!guest) {
      return {
        success: false,
        error: "Sign in with your guest account to review a safari.",
        code: "UNAUTHENTICATED",
      };
    }

    const parsed = SafariReviewSubmitSchema.parse(input);
    const review = await ReviewService.submit(parsed, guest.guestProfileId, guest.userId);

    revalidatePath(`/safari/review/${parsed.tripId}`);
    revalidatePath("/admin/safari/fleet");
    revalidatePath("/admin/safari/fleet/vehicles");
    revalidatePath("/admin/safari/fleet/drivers");

    return actionOk({ reviewId: review.id });
  } catch (error) {
    return actionError(error, "submitSafariReviewAction");
  }
}

/** Staff-side rating profile for a vehicle (averages, trend, weaknesses). */
export async function getVehicleRatingProfileAction(
  vehicleId: string
): Promise<FleetActionResult<RatingProfile>> {
  try {
    await requireFleetPermission("fleet:view");
    return actionOk(await RatingService.getVehicleRatingProfile(vehicleId));
  } catch (error) {
    return actionError(error, "getVehicleRatingProfileAction");
  }
}

/** Staff-side rating profile for a driver. */
export async function getDriverRatingProfileAction(
  driverId: string
): Promise<FleetActionResult<RatingProfile>> {
  try {
    await requireFleetPermission("fleet:view");
    return actionOk(await RatingService.getDriverRatingProfile(driverId));
  } catch (error) {
    return actionError(error, "getDriverRatingProfileAction");
  }
}

export interface FleetPermissionsPayload {
  roles: string[];
  permissions: FleetPermission[];
}

/** Exposes the caller's own fleet permissions so the UI can hide dead controls. */
export async function getMyFleetPermissionsAction(): Promise<
  FleetActionResult<FleetPermissionsPayload>
> {
  try {
    const actor = await getFleetActor();
    return actionOk({ roles: actor.roles, permissions: actor.permissions });
  } catch (error) {
    return actionError(error, "getMyFleetPermissionsAction");
  }
}
