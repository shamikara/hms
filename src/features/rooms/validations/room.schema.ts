import { z } from "zod";
import { RoomStatus } from "@prisma/client";

export const RoomTypeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  basePrice: z.number().min(0, "Price cannot be negative"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  amenities: z.array(z.string()).default([]),
});

export const RoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  status: z.nativeEnum(RoomStatus).default(RoomStatus.AVAILABLE),
  roomTypeId: z.string().cuid("Invalid Room Type"),
});

export type CreateRoomTypeFormValues = z.infer<typeof RoomTypeSchema>;
export type CreateRoomFormValues = z.infer<typeof RoomSchema>;
