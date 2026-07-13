import { z } from "zod";
import { VehicleStatus } from "@prisma/client";

export const VehicleSchema = z.object({
  plateNumber: z.string().min(1, "Plate number is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  capacity: z.number().int().min(1, "Capacity must be at least 1"),
  status: z.nativeEnum(VehicleStatus).default(VehicleStatus.AVAILABLE),
});

export const SafariScheduleSchema = z.object({
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  vehicleId: z.string().cuid("Valid vehicle ID required"),
  routeId: z.string().cuid("Valid route ID required"),
  guideId: z.string().cuid("Valid guide ID required"),
  driverId: z.string().cuid("Valid driver ID required"),
}).refine((data) => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
});

export type VehicleFormValues = z.infer<typeof VehicleSchema>;
export type SafariScheduleFormValues = z.infer<typeof SafariScheduleSchema>;
