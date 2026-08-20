"use server";

import { revalidatePath } from "next/cache";
import { MaintenanceStatus } from "@prisma/client";
import { requireFleetPermission } from "../lib/authz";
import { resolveActivePropertyId } from "../lib/property";
import {
  actionError,
  actionOk,
  isConnectivityError,
  type FleetActionResult,
} from "../lib/actionResult";
import {
  FuelLogCreateSchema,
  MaintenanceCreateSchema,
  MaintenanceUpdateSchema,
  VehicleDocumentArchiveSchema,
  VehicleDocumentCreateSchema,
  VehicleDocumentUpdateSchema,
} from "../validations/fleet.schema";
import {
  DocumentRepository,
  FuelRepository,
  MaintenanceRepository,
  type DocumentRow,
  type FuelLogRow,
  type MaintenanceRow,
} from "../repositories/ops.repository";
import { DocumentService, FuelService, MaintenanceService } from "../services/ops.service";

function revalidateOps(vehicleId?: string): void {
  revalidatePath("/admin/safari/fleet");
  revalidatePath("/admin/safari/fleet/maintenance");
  revalidatePath("/admin/safari/fleet/fuel");
  revalidatePath("/admin/safari/fleet/documents");
  revalidatePath("/admin/safari/fleet/vehicles");
  if (vehicleId) revalidatePath(`/admin/safari/fleet/vehicles/${vehicleId}`);
}

function dbUnavailable<T>(): FleetActionResult<T> {
  return {
    success: false,
    error: "The fleet database is unreachable right now.",
    code: "DB_UNAVAILABLE",
  };
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export async function listMaintenanceAction(input?: {
  propertyId?: string;
  vehicleId?: string;
  status?: MaintenanceStatus;
}): Promise<FleetActionResult<{ propertyId: string; records: MaintenanceRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const propertyId = await resolveActivePropertyId(actor, input?.propertyId);
    const records = await MaintenanceRepository.list({
      propertyId,
      vehicleId: input?.vehicleId,
      status: input?.status,
    });
    return actionOk({ propertyId, records });
  } catch (error) {
    if (isConnectivityError(error)) return dbUnavailable();
    return actionError(error, "listMaintenanceAction");
  }
}

export async function createMaintenanceAction(
  input: unknown
): Promise<FleetActionResult<MaintenanceRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = MaintenanceCreateSchema.parse(input);
    const record = await MaintenanceService.create(parsed, actor.userId, actor.employeeId);
    revalidateOps(parsed.vehicleId);
    return actionOk(record);
  } catch (error) {
    return actionError(error, "createMaintenanceAction");
  }
}

export async function updateMaintenanceAction(
  input: unknown
): Promise<FleetActionResult<MaintenanceRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = MaintenanceUpdateSchema.parse(input);
    const record = await MaintenanceService.update(parsed, actor.userId);
    revalidateOps(record.vehicleId);
    return actionOk(record);
  } catch (error) {
    return actionError(error, "updateMaintenanceAction");
  }
}

// ---------------------------------------------------------------------------
// Fuel
// ---------------------------------------------------------------------------

export async function listFuelLogsAction(input?: {
  propertyId?: string;
  vehicleId?: string;
}): Promise<FleetActionResult<{ propertyId: string; logs: FuelLogRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const propertyId = await resolveActivePropertyId(actor, input?.propertyId);
    const logs = await FuelRepository.list({ propertyId, vehicleId: input?.vehicleId });
    return actionOk({ propertyId, logs });
  } catch (error) {
    if (isConnectivityError(error)) return dbUnavailable();
    return actionError(error, "listFuelLogsAction");
  }
}

export async function createFuelLogAction(
  input: unknown
): Promise<FleetActionResult<FuelLogRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = FuelLogCreateSchema.parse(input);
    const log = await FuelService.create(parsed, actor.userId, actor.employeeId);
    revalidateOps(parsed.vehicleId);
    return actionOk(log);
  } catch (error) {
    return actionError(error, "createFuelLogAction");
  }
}

export interface FuelAnalyticsPayload {
  efficiency: Awaited<ReturnType<typeof FuelService.efficiencyForVehicle>>;
  trend: Awaited<ReturnType<typeof FuelService.costTrendForVehicle>>;
}

/** Fuel efficiency for one vehicle. Nulls carry a reason; nothing is estimated. */
export async function getFuelAnalyticsAction(
  vehicleId: string
): Promise<FleetActionResult<FuelAnalyticsPayload>> {
  try {
    await requireFleetPermission("fleet:cost");
    const [efficiency, trend] = await Promise.all([
      FuelService.efficiencyForVehicle(vehicleId),
      FuelService.costTrendForVehicle(vehicleId),
    ]);
    return actionOk({ efficiency, trend });
  } catch (error) {
    if (isConnectivityError(error)) return dbUnavailable();
    return actionError(error, "getFuelAnalyticsAction");
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function listVehicleDocumentsAction(input?: {
  propertyId?: string;
  vehicleId?: string;
}): Promise<FleetActionResult<{ propertyId: string; documents: DocumentRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const propertyId = await resolveActivePropertyId(actor, input?.propertyId);
    const documents = await DocumentRepository.list({
      propertyId,
      vehicleId: input?.vehicleId,
    });
    return actionOk({ propertyId, documents });
  } catch (error) {
    if (isConnectivityError(error)) return dbUnavailable();
    return actionError(error, "listVehicleDocumentsAction");
  }
}

export async function createVehicleDocumentAction(
  input: unknown
): Promise<FleetActionResult<DocumentRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleDocumentCreateSchema.parse(input);
    const document = await DocumentService.create(parsed, actor.userId);
    revalidateOps(parsed.vehicleId);
    return actionOk(document);
  } catch (error) {
    return actionError(error, "createVehicleDocumentAction");
  }
}

export async function updateVehicleDocumentAction(
  input: unknown
): Promise<FleetActionResult<DocumentRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleDocumentUpdateSchema.parse(input);
    const document = await DocumentService.update(parsed, actor.userId);
    revalidateOps(document.vehicleId);
    return actionOk(document);
  } catch (error) {
    return actionError(error, "updateVehicleDocumentAction");
  }
}

export async function archiveVehicleDocumentAction(
  input: unknown
): Promise<FleetActionResult<DocumentRow>> {
  try {
    const actor = await requireFleetPermission("fleet:manage");
    const parsed = VehicleDocumentArchiveSchema.parse(input);
    const document = await DocumentService.archive(parsed.id, actor.userId);
    revalidateOps(document.vehicleId);
    return actionOk(document);
  } catch (error) {
    return actionError(error, "archiveVehicleDocumentAction");
  }
}
