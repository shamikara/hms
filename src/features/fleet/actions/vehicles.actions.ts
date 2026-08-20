"use server";

import { revalidatePath } from "next/cache";
import { VehicleStatus } from "@prisma/client";
import { requireFleetPermission } from "../lib/authz";
import { getPropertyContext, resolveActivePropertyId } from "../lib/property";
import {
  actionError,
  actionNotFound,
  actionOk,
  actionUnavailable,
  isConnectivityError,
  type FleetActionResult,
} from "../lib/actionResult";
import {
  VehicleArchiveSchema,
  VehicleCreateSchema,
  VehicleStatusChangeSchema,
  VehicleUpdateSchema,
} from "../validations/fleet.schema";
import { VehicleRepository, type VehicleRow } from "../repositories/vehicle.repository";
import { VehicleService } from "../services/vehicle.service";
import { AnalyticsService } from "../services/analytics.service";
import { ReviewService } from "../services/review.service";
import { MaintenanceRepository, FuelRepository, DocumentRepository } from "../repositories/ops.repository";
import { TripRepository } from "../repositories/trip.repository";

/**
 * Vehicle server actions.
 *
 * Every one of these re-checks authorization: server actions are reachable by a
 * direct POST, so the permission gate cannot live only in the page.
 */

const FLEET_PATHS = [
  "/admin/safari/fleet",
  "/admin/safari/fleet/vehicles",
  "/admin/safari/fleet/trips",
];

function revalidateFleet(extra: string[] = []): void {
  for (const path of [...FLEET_PATHS, ...extra]) revalidatePath(path);
}

export async function listVehiclesAction(input?: {
  propertyId?: string;
  status?: VehicleStatus;
  search?: string;
  includeArchived?: boolean;
}): Promise<FleetActionResult<{ propertyId: string; vehicles: VehicleRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const propertyId = await resolveActivePropertyId(actor, input?.propertyId);
    const vehicles = await VehicleRepository.list({
      propertyId,
      status: input?.status,
      search: input?.search,
      includeArchived: input?.includeArchived,
    });
    return actionOk({ propertyId, vehicles });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "listVehiclesAction");
  }
}

/** Everything the vehicle detail page renders, in one round trip. */
export interface VehicleDetailPayload {
  analytics: NonNullable<Awaited<ReturnType<typeof AnalyticsService.getVehicleAnalytics>>>;
  trips: Awaited<ReturnType<typeof TripRepository.list>>;
  maintenance: Awaited<ReturnType<typeof MaintenanceRepository.list>>;
  fuelLogs: Awaited<ReturnType<typeof FuelRepository.list>>;
  documents: Awaited<ReturnType<typeof DocumentRepository.list>>;
  reviews: Awaited<ReturnType<typeof ReviewService.listForVehicle>>;
  currencyCode: string;
}

export async function getVehicleDetailAction(
  vehicleId: string
): Promise<FleetActionResult<VehicleDetailPayload>> {
  try {
    await requireFleetPermission("fleet:view");

    const [analytics, trips, maintenance, fuelLogs, documents, reviews] = await Promise.all([
      AnalyticsService.getVehicleAnalytics(vehicleId),
      TripRepository.list({ vehicleId, take: 25 }),
      MaintenanceRepository.list({ vehicleId, take: 25 }),
      FuelRepository.list({ vehicleId, take: 25 }),
      DocumentRepository.list({ vehicleId }),
      ReviewService.listForVehicle(vehicleId, 15),
    ]);

    if (!analytics) return actionNotFound("Vehicle not found.");

    const property = await getPropertyContext(analytics.vehicle.propertyId);

    return actionOk({
      analytics,
      trips,
      maintenance,
      fuelLogs,
      documents,
      reviews,
      currencyCode: property?.baseCurrency ?? "USD",
    });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "getVehicleDetailAction");
  }
}

export async function createVehicleAction(
  input: unknown
): Promise<FleetActionResult<VehicleRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleCreateSchema.parse(input);
    const propertyId = await resolveActivePropertyId(actor, parsed.propertyId);
    const vehicle = await VehicleService.create({ ...parsed, propertyId }, actor.userId);
    revalidateFleet();
    return actionOk(vehicle);
  } catch (error) {
    return actionError(error, "createVehicleAction");
  }
}

export async function updateVehicleAction(
  input: unknown
): Promise<FleetActionResult<VehicleRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleUpdateSchema.parse(input);
    const vehicle = await VehicleService.update(parsed, actor.userId);
    revalidateFleet([`/admin/safari/fleet/vehicles/${parsed.id}`]);
    return actionOk(vehicle);
  } catch (error) {
    return actionError(error, "updateVehicleAction");
  }
}

export async function changeVehicleStatusAction(
  input: unknown
): Promise<FleetActionResult<VehicleRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleStatusChangeSchema.parse(input);
    const vehicle = await VehicleService.changeStatus(parsed, actor.userId);
    revalidateFleet([`/admin/safari/fleet/vehicles/${parsed.id}`]);
    return actionOk(vehicle);
  } catch (error) {
    return actionError(error, "changeVehicleStatusAction");
  }
}

export async function archiveVehicleAction(
  input: unknown
): Promise<FleetActionResult<VehicleRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleArchiveSchema.parse(input);
    const vehicle = await VehicleService.setArchived(parsed, actor.userId);
    revalidateFleet([`/admin/safari/fleet/vehicles/${parsed.id}`]);
    return actionOk(vehicle);
  } catch (error) {
    return actionError(error, "archiveVehicleAction");
  }
}
