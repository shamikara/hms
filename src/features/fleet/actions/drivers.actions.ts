"use server";

import { revalidatePath } from "next/cache";
import { DriverEmploymentStatus } from "@prisma/client";
import { requireFleetPermission } from "../lib/authz";
import { resolveActivePropertyId } from "../lib/property";
import {
  actionError,
  actionNotFound,
  actionOk,
  actionUnavailable,
  isConnectivityError,
  type FleetActionResult,
} from "../lib/actionResult";
import {
  DriverArchiveSchema,
  DriverCreateSchema,
  DriverUpdateSchema,
} from "../validations/fleet.schema";
import { DriverRepository, type DriverRow } from "../repositories/driver.repository";
import { TripRepository } from "../repositories/trip.repository";
import { DriverService } from "../services/driver.service";
import { RatingService } from "../services/rating.service";
import { ReviewService } from "../services/review.service";

function revalidateDrivers(driverId?: string): void {
  revalidatePath("/admin/safari/fleet/drivers");
  revalidatePath("/admin/safari/fleet");
  if (driverId) revalidatePath(`/admin/safari/fleet/drivers/${driverId}`);
}

export async function listDriversAction(input?: {
  propertyId?: string;
  employmentStatus?: DriverEmploymentStatus;
  search?: string;
  includeArchived?: boolean;
}): Promise<FleetActionResult<{ propertyId: string; drivers: DriverRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const propertyId = await resolveActivePropertyId(actor, input?.propertyId);
    const drivers = await DriverRepository.list({
      propertyId,
      employmentStatus: input?.employmentStatus,
      search: input?.search,
      includeArchived: input?.includeArchived,
    });
    return actionOk({ propertyId, drivers });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "listDriversAction");
  }
}

export interface DriverCandidatesPayload {
  propertyId: string;
  candidates: Awaited<ReturnType<typeof DriverRepository.listEligibleEmployees>>;
  guides: Awaited<ReturnType<typeof DriverRepository.listGuideCandidates>>;
}

/** Employees who do not yet have a driver profile, for the "register" picker. */
export async function listDriverCandidatesAction(
  propertyId?: string
): Promise<FleetActionResult<DriverCandidatesPayload>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const resolved = await resolveActivePropertyId(actor, propertyId);
    const [candidates, guides] = await Promise.all([
      DriverRepository.listEligibleEmployees(resolved),
      DriverRepository.listGuideCandidates(resolved),
    ]);
    return actionOk({ propertyId: resolved, candidates, guides });
  } catch (error) {
    if (isConnectivityError(error)) {
      return actionUnavailable("The staff directory is unreachable right now.");
    }
    return actionError(error, "listDriverCandidatesAction");
  }
}

export interface DriverDetailPayload {
  driver: NonNullable<Awaited<ReturnType<typeof DriverRepository.findById>>>;
  ratingProfile: Awaited<ReturnType<typeof RatingService.getDriverRatingProfile>>;
  trips: Awaited<ReturnType<typeof TripRepository.list>>;
  reviews: Awaited<ReturnType<typeof ReviewService.listForDriver>>;
}

export async function getDriverDetailAction(
  driverId: string
): Promise<FleetActionResult<DriverDetailPayload>> {
  try {
    await requireFleetPermission("fleet:view");
    const driver = await DriverRepository.findById(driverId);
    if (!driver) return actionNotFound("Driver not found.");
    const [ratingProfile, trips, reviews] = await Promise.all([
      RatingService.getDriverRatingProfile(driverId),
      TripRepository.list({ driverId, take: 25 }),
      ReviewService.listForDriver(driverId, 15),
    ]);
    return actionOk({ driver, ratingProfile, trips, reviews });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "getDriverDetailAction");
  }
}

export async function createDriverAction(
  input: unknown
): Promise<FleetActionResult<DriverRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = DriverCreateSchema.parse(input);
    const driver = await DriverService.create(parsed, actor.userId);
    revalidateDrivers();
    return actionOk(driver);
  } catch (error) {
    return actionError(error, "createDriverAction");
  }
}

export async function updateDriverAction(
  input: unknown
): Promise<FleetActionResult<DriverRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = DriverUpdateSchema.parse(input);
    const driver = await DriverService.update(parsed, actor.userId);
    revalidateDrivers(parsed.id);
    return actionOk(driver);
  } catch (error) {
    return actionError(error, "updateDriverAction");
  }
}

export async function archiveDriverAction(
  input: unknown
): Promise<FleetActionResult<DriverRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = DriverArchiveSchema.parse(input);
    const driver = await DriverService.setArchived(parsed, actor.userId);
    revalidateDrivers(parsed.id);
    return actionOk(driver);
  } catch (error) {
    return actionError(error, "archiveDriverAction");
  }
}
