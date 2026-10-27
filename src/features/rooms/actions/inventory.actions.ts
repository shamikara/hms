"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";
import {
  requireAdminPermission,
  resolveDefaultPropertyId,
  NO_PROPERTY,
} from "@/features/admin/lib/requireAdminSession";
import {
  BuildingSchema,
  FloorSchema,
  HousekeepingSchema,
  RoomSchema,
  RoomTypeSchema,
} from "../validations/room.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

/** Prisma errors name tables and columns; callers get something sayable. */
function fail(context: string, error: unknown): Result<never> {
  console.error(`${context} failed:`, error instanceof Error ? error.message : error);
  return { success: false, error: "That did not save. Please try again." };
}

function firstIssue(error: z.ZodError): string {
  return error.issues?.[0]?.message ?? "Please check the details and try again.";
}

/* ------------------------------------------------------------------ read */

export interface InventoryRoomType {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  /** Null means no rate is set, which reads as rate-on-request, not free. */
  basePrice: number | null;
  roomCount: number;
}

export interface InventoryRoom {
  id: string;
  roomNumber: string;
  status: "AVAILABLE" | "MAINTENANCE" | "OUT_OF_ORDER";
  housekeeping: "CLEAN" | "DIRTY" | "INSPECTED";
  roomTypeId: string;
  roomTypeName: string;
  floorId: string;
  floorLabel: string;
  /** True while a guest is in the room, which blocks archiving it. */
  occupied: boolean;
}

export interface InventoryFloor {
  id: string;
  level: number;
  buildingId: string;
  buildingName: string;
  label: string;
}

export interface Inventory {
  propertyId: string;
  currencyCode: string;
  roomTypes: InventoryRoomType[];
  rooms: InventoryRoom[];
  floors: InventoryFloor[];
  buildings: { id: string; name: string }[];
}

export async function getInventory(propertyId?: string): Promise<Result<Inventory>> {
  const guard = await requireAdminPermission("rooms:view");
  if (!guard.ok) return guard.failure;

  try {
    const propId = propertyId ?? (await resolveDefaultPropertyId());
    if (!propId) return { success: false, error: NO_PROPERTY };

    const [property, roomTypes, buildings, rooms] = await Promise.all([
      prisma.property.findUnique({ where: { id: propId }, select: { baseCurrency: true } }),
      prisma.roomType.findMany({
        where: { propertyId: propId, deletedAt: null },
        include: { _count: { select: { rooms: { where: { deletedAt: null } } } } },
        orderBy: { name: "asc" },
      }),
      prisma.building.findMany({
        where: { propertyId: propId, deletedAt: null },
        include: { floors: { where: { deletedAt: null }, orderBy: { level: "asc" } } },
        orderBy: { name: "asc" },
      }),
      prisma.room.findMany({
        where: { deletedAt: null, floor: { building: { propertyId: propId } } },
        include: {
          roomType: { select: { id: true, name: true } },
          floor: { select: { id: true, level: true, building: { select: { name: true } } } },
          // One live assignment covering today is enough to call it occupied.
          assignments: {
            where: {
              releasedAt: null,
              startDate: { lte: new Date() },
              endDate: { gt: new Date() },
              stay: { status: "CHECKED_IN" },
            },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { roomNumber: "asc" },
      }),
    ]);

    const floors: InventoryFloor[] = buildings.flatMap((building) =>
      building.floors.map((floor) => ({
        id: floor.id,
        level: floor.level,
        buildingId: building.id,
        buildingName: building.name,
        label: `${building.name} · Floor ${floor.level}`,
      })),
    );

    return {
      success: true,
      data: {
        propertyId: propId,
        currencyCode: property?.baseCurrency ?? "USD",
        roomTypes: roomTypes.map((rt) => ({
          id: rt.id,
          name: rt.name,
          description: rt.description,
          capacity: rt.capacity,
          basePrice: rt.basePrice === null ? null : Number(rt.basePrice),
          roomCount: rt._count.rooms,
        })),
        rooms: rooms.map((room) => ({
          id: room.id,
          roomNumber: room.roomNumber,
          status: room.status,
          housekeeping: room.housekeeping,
          roomTypeId: room.roomType.id,
          roomTypeName: room.roomType.name,
          floorId: room.floor.id,
          floorLabel: `${room.floor.building.name} · Floor ${room.floor.level}`,
          occupied: room.assignments.length > 0,
        })),
        floors,
        buildings: buildings.map((b) => ({ id: b.id, name: b.name })),
      },
    };
  } catch (error) {
    return fail("getInventory", error);
  }
}

/* ------------------------------------------------------------ room types */

export async function createRoomType(input: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  const parsed = RoomTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    const propId = await resolveDefaultPropertyId();
    if (!propId) return { success: false, error: NO_PROPERTY };

    const created = await prisma.roomType.create({
      data: {
        propertyId: propId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        capacity: parsed.data.capacity,
        basePrice: parsed.data.basePrice ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/admin/rooms");
    return { success: true, data: created };
  } catch (error) {
    return fail("createRoomType", error);
  }
}

export async function updateRoomType(id: string, input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  const parsed = RoomTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    await prisma.roomType.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        capacity: parsed.data.capacity,
        basePrice: parsed.data.basePrice ?? null,
      },
    });

    // Rates show on the public booking screen, so it has to be rebuilt too.
    revalidatePath("/admin/rooms");
    revalidatePath("/book");
    return { success: true };
  } catch (error) {
    return fail("updateRoomType", error);
  }
}

export async function archiveRoomType(id: string): Promise<Result> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  try {
    const roomCount = await prisma.room.count({ where: { roomTypeId: id, deletedAt: null } });
    if (roomCount > 0) {
      return {
        success: false,
        error: `This type still has ${roomCount} room${roomCount === 1 ? "" : "s"}. Archive or move those first.`,
      };
    }

    // Soft delete, following the convention used across this schema: a type
    // that historic reservations point at must still resolve.
    await prisma.roomType.update({ where: { id }, data: { deletedAt: new Date() } });
    revalidatePath("/admin/rooms");
    revalidatePath("/book");
    return { success: true };
  } catch (error) {
    return fail("archiveRoomType", error);
  }
}

/* -------------------------------------------------- buildings and floors */

export async function createBuilding(input: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  const parsed = BuildingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    const propId = await resolveDefaultPropertyId();
    if (!propId) return { success: false, error: NO_PROPERTY };

    const created = await prisma.building.create({
      data: { propertyId: propId, name: parsed.data.name },
      select: { id: true },
    });
    revalidatePath("/admin/rooms");
    return { success: true, data: created };
  } catch (error) {
    return fail("createBuilding", error);
  }
}

export async function createFloor(input: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  const parsed = FloorSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    const created = await prisma.floor.create({
      data: { buildingId: parsed.data.buildingId, level: parsed.data.level },
      select: { id: true },
    });
    revalidatePath("/admin/rooms");
    return { success: true, data: created };
  } catch (error) {
    return fail("createFloor", error);
  }
}

/* ----------------------------------------------------------------- rooms */

export async function createRoom(input: unknown): Promise<Result<{ id: string }>> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  const parsed = RoomSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    const created = await prisma.room.create({
      data: {
        roomNumber: parsed.data.roomNumber,
        roomTypeId: parsed.data.roomTypeId,
        floorId: parsed.data.floorId,
        status: parsed.data.status,
      },
      select: { id: true },
    });
    revalidatePath("/admin/rooms");
    revalidatePath("/book");
    return { success: true, data: created };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "That room number already exists on this floor." };
    }
    return fail("createRoom", error);
  }
}

export async function updateRoom(id: string, input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  const parsed = RoomSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    await prisma.room.update({
      where: { id },
      data: {
        roomNumber: parsed.data.roomNumber,
        roomTypeId: parsed.data.roomTypeId,
        floorId: parsed.data.floorId,
        status: parsed.data.status,
      },
    });
    revalidatePath("/admin/rooms");
    revalidatePath("/book");
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "That room number already exists on this floor." };
    }
    return fail("updateRoom", error);
  }
}

export async function archiveRoom(id: string): Promise<Result> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  try {
    // A room with a guest in it, or one promised to a guest later, cannot be
    // taken out of inventory — the booking would have nowhere to live.
    const held = await prisma.roomAssignment.count({
      where: {
        roomId: id,
        releasedAt: null,
        endDate: { gt: new Date() },
      },
    });
    if (held > 0) {
      return {
        success: false,
        error: "This room has current or future bookings. Move or cancel those first.",
      };
    }

    await prisma.room.update({ where: { id }, data: { deletedAt: new Date() } });
    revalidatePath("/admin/rooms");
    revalidatePath("/book");
    return { success: true };
  } catch (error) {
    return fail("archiveRoom", error);
  }
}

/* ---------------------------------------------------------- housekeeping */

export async function setHousekeeping(input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("housekeeping:manage");
  if (!guard.ok) return guard.failure;

  const parsed = HousekeepingSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  try {
    await prisma.room.update({
      where: { id: parsed.data.roomId },
      data: { housekeeping: parsed.data.housekeeping },
    });
    revalidatePath("/admin/rooms");
    return { success: true };
  } catch (error) {
    return fail("setHousekeeping", error);
  }
}
