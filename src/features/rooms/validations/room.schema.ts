import { z } from "zod";
import { HousekeepingStatus, RoomStatus } from "@prisma/client";

/**
 * Nightly rate.
 *
 * Optional, and an empty string means "no rate set" rather than free: the
 * column is nullable so that an unpriced room type reads as rate-on-request
 * on the booking screen instead of being quoted at zero.
 */
const basePrice = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: "custom", message: "Enter a number, or leave blank for rate on request" });
      return z.NEVER;
    }
    if (parsed < 0) {
      ctx.addIssue({ code: "custom", message: "A rate cannot be negative" });
      return z.NEVER;
    }
    return parsed;
  })
  .nullable()
  .optional();

export const RoomTypeSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("").transform(() => undefined)),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(20),
  basePrice,
});

export const RoomSchema = z.object({
  roomNumber: z.string().trim().min(1, "Room number is required").max(20),
  roomTypeId: z.string().cuid("Choose a room type"),
  floorId: z.string().cuid("Choose a floor"),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
});

export const RoomUpdateSchema = RoomSchema.partial().extend({
  id: z.string().cuid(),
});

export const BuildingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
});

export const FloorSchema = z.object({
  buildingId: z.string().cuid("Choose a building"),
  level: z.coerce.number().int().min(-5).max(200),
});

export const HousekeepingSchema = z.object({
  roomId: z.string().cuid(),
  housekeeping: z.nativeEnum(HousekeepingStatus),
});

export type RoomTypeFormValues = z.infer<typeof RoomTypeSchema>;
export type RoomFormValues = z.infer<typeof RoomSchema>;
export type BuildingFormValues = z.infer<typeof BuildingSchema>;
export type FloorFormValues = z.infer<typeof FloorSchema>;
