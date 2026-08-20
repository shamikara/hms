"use server";

import { revalidatePath } from "next/cache";
import { SafariTripStatus } from "@prisma/client";
import { requireFleetPermission } from "../lib/authz";
import { resolveActivePropertyId } from "../lib/property";
import {
  actionError,
  actionOk,
  actionUnavailable,
  isConnectivityError,
  type FleetActionResult,
} from "../lib/actionResult";
import {
  AvailabilityQuerySchema,
  TripCancelSchema,
  TripCompleteSchema,
  TripCreateSchema,
  TripListFilterSchema,
  TripStartSchema,
  TripUpdateSchema,
} from "../validations/fleet.schema";
import { TripRepository, type TripRow } from "../repositories/trip.repository";
import {
  AvailabilityService,
  type AssignmentConflict,
  type DriverAvailability,
  type VehicleAvailability,
} from "../services/availability.service";
import { TripService } from "../services/trip.service";

function revalidateTrips(): void {
  revalidatePath("/admin/safari/fleet/trips");
  revalidatePath("/admin/safari/fleet");
  revalidatePath("/admin/safari/fleet/vehicles");
}

export async function listTripsAction(
  input?: unknown
): Promise<FleetActionResult<{ propertyId: string; trips: TripRow[] }>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const parsed = TripListFilterSchema.parse(input ?? {});
    const propertyId = await resolveActivePropertyId(actor, parsed.propertyId);
    const trips = await TripRepository.list({
      propertyId,
      status: parsed.status,
      vehicleId: parsed.vehicleId,
      driverId: parsed.driverId,
      from: parsed.from,
      to: parsed.to,
      take: parsed.take,
    });
    return actionOk({ propertyId, trips });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "listTripsAction");
  }
}

/**
 * Powers the assignment dialog: which vehicles and drivers can take a job in a
 * given window, and why the others cannot.
 */
export async function getAvailabilityAction(input: unknown): Promise<
  FleetActionResult<{
    propertyId: string;
    vehicles: VehicleAvailability[];
    drivers: DriverAvailability[];
  }>
> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const parsed = AvailabilityQuerySchema.parse(input);
    const propertyId = await resolveActivePropertyId(actor, parsed.propertyId);

    const [vehicles, drivers] = await Promise.all([
      AvailabilityService.listVehicleAvailability({
        propertyId,
        start: parsed.start,
        end: parsed.end,
        guestCount: parsed.guestCount,
        excludeTripId: parsed.excludeTripId,
      }),
      AvailabilityService.listDriverAvailability({
        propertyId,
        start: parsed.start,
        end: parsed.end,
        excludeTripId: parsed.excludeTripId,
      }),
    ]);

    return actionOk({ propertyId, vehicles, drivers });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "getAvailabilityAction");
  }
}

/**
 * Dry-run conflict check for one specific vehicle/driver/guide combination.
 * The same check runs again inside the assignment transaction — this one exists
 * so the dispatcher sees the problem before pressing confirm.
 */
export async function checkAssignmentConflictsAction(input: {
  start: string | Date;
  end: string | Date;
  guestCount: number;
  vehicleId?: string;
  driverId?: string;
  guideId?: string;
  excludeTripId?: string;
}): Promise<FleetActionResult<{ conflicts: AssignmentConflict[] }>> {
  try {
    await requireFleetPermission("fleet:dispatch");
    const start = new Date(input.start);
    const end = new Date(input.end);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      return { success: false, error: "Invalid dates.", code: "VALIDATION_ERROR" };
    }
    if (end <= start) {
      return {
        success: false,
        error: "Return time must be after departure time.",
        code: "VALIDATION_ERROR",
      };
    }

    const conflicts = await AvailabilityService.checkAssignment({
      start,
      end,
      guestCount: input.guestCount,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      guideId: input.guideId,
      excludeTripId: input.excludeTripId,
    });

    return actionOk({ conflicts });
  } catch (error) {
    return actionError(error, "checkAssignmentConflictsAction");
  }
}

export async function createTripAction(
  input: unknown
): Promise<FleetActionResult<TripRow>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const parsed = TripCreateSchema.parse(input);
    const propertyId = await resolveActivePropertyId(actor, parsed.propertyId);
    const trip = await TripService.createTrip({ ...parsed, propertyId }, actor.userId);
    revalidateTrips();
    return actionOk(trip);
  } catch (error) {
    return actionError(error, "createTripAction");
  }
}

/** Dispatches an existing game-drive schedule as an operational trip. */
export async function dispatchScheduleAction(input: {
  scheduleId: string;
  driverId: string;
  destination?: string;
}): Promise<FleetActionResult<TripRow>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const trip = await TripService.dispatchSchedule(
      input.scheduleId,
      input.driverId,
      actor.userId,
      input.destination
    );
    revalidateTrips();
    return actionOk(trip);
  } catch (error) {
    return actionError(error, "dispatchScheduleAction");
  }
}

export async function updateTripAction(
  input: unknown
): Promise<FleetActionResult<TripRow>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const parsed = TripUpdateSchema.parse(input);
    const trip = await TripService.updateTrip(parsed, actor.userId);
    revalidateTrips();
    return actionOk(trip);
  } catch (error) {
    return actionError(error, "updateTripAction");
  }
}

export async function startTripAction(
  input: unknown
): Promise<FleetActionResult<TripRow>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const parsed = TripStartSchema.parse(input);
    const trip = await TripService.startTrip(parsed, actor.userId);
    revalidateTrips();
    return actionOk(trip);
  } catch (error) {
    return actionError(error, "startTripAction");
  }
}

export async function completeTripAction(
  input: unknown
): Promise<FleetActionResult<TripRow>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const parsed = TripCompleteSchema.parse(input);
    const trip = await TripService.completeTrip(parsed, actor.userId);
    revalidateTrips();
    return actionOk(trip);
  } catch (error) {
    return actionError(error, "completeTripAction");
  }
}

export async function cancelTripAction(
  input: unknown
): Promise<FleetActionResult<TripRow>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const parsed = TripCancelSchema.parse(input);
    const trip = await TripService.cancelTrip(parsed, actor.userId);
    revalidateTrips();
    return actionOk(trip);
  } catch (error) {
    return actionError(error, "cancelTripAction");
  }
}

export interface DispatchableSchedulesPayload {
  propertyId: string;
  schedules: Array<
    Awaited<ReturnType<typeof TripRepository.listDispatchableSchedules>>[number] & {
      totalGuests: number;
    }
  >;
}

/**
 * Undispatched game-drive schedules with bookings, so a dispatcher can pull the
 * existing booking flow into fleet operations.
 */
export async function listDispatchableSchedulesAction(
  propertyId?: string
): Promise<FleetActionResult<DispatchableSchedulesPayload>> {
  try {
    const actor = await requireFleetPermission("fleet:dispatch");
    const resolved = await resolveActivePropertyId(actor, propertyId);
    const schedules = await TripRepository.listDispatchableSchedules(resolved, new Date());

    return actionOk({
      propertyId: resolved,
      schedules: schedules.map((s) => ({
        ...s,
        totalGuests: s.bookings.reduce((sum, b) => sum + b.guestCount, 0),
      })),
    });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "listDispatchableSchedulesAction");
  }
}

export interface TodayBoardPayload {
  propertyId: string;
  today: TripRow[];
  active: TripRow[];
  upcoming: TripRow[];
}

/** Today's board, grouped for the trips page. */
export async function getTodayBoardAction(
  propertyId?: string
): Promise<FleetActionResult<TodayBoardPayload>> {
  try {
    const actor = await requireFleetPermission("fleet:view");
    const resolved = await resolveActivePropertyId(actor, propertyId);

    const now = new Date();
    const dayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const dayEnd = new Date(dayStart.getTime() + 24 * 3_600_000);

    const [today, active, upcoming] = await Promise.all([
      TripRepository.list({ propertyId: resolved, from: dayStart, to: dayEnd, take: 100 }),
      TripRepository.list({
        propertyId: resolved,
        statuses: [SafariTripStatus.IN_PROGRESS],
        take: 50,
      }),
      TripRepository.list({
        propertyId: resolved,
        statuses: [SafariTripStatus.SCHEDULED, SafariTripStatus.CONFIRMED],
        from: dayEnd,
        take: 50,
      }),
    ]);

    return actionOk({ propertyId: resolved, today, active, upcoming });
  } catch (error) {
    if (isConnectivityError(error)) return actionUnavailable();
    return actionError(error, "getTodayBoardAction");
  }
}
