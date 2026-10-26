import { z } from "zod";
import { ReservationStatus } from "@prisma/client";

export const GuestSchema = z.object({
  firstName: z.string().trim().min(2, "First name is required").max(100),
  lastName: z.string().trim().min(2, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address").max(254),
  /** Optional, but the only way the desk can reach a guest about their arrival. */
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a phone number we can reach you on")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const ReservationSchema = z.object({
  propertyId: z.string().cuid("Property ID is required"),
  guestId: z.string().cuid("Guest ID is required"),
  roomTypeIds: z.array(z.string().cuid()).min(1, "At least one room type must be selected"),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  status: z.nativeEnum(ReservationStatus).default(ReservationStatus.DRAFT),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

/**
 * The dates a public availability search is allowed to ask about.
 *
 * Separate from ReservationSchema because a search has no guest or room type
 * yet, and because these bounds are about what the public form may ask for
 * rather than what the database will accept.
 */
export const AvailabilitySchema = z.object({
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
}).refine((data) => {
  // Compared at day granularity in UTC, on both sides. A date input sends
  // "yyyy-mm-dd", which parses to UTC midnight; comparing that against *local*
  // midnight rejected today's date for any server running west of UTC.
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return data.checkInDate >= today;
}, {
  message: "Check-in cannot be in the past",
  path: ["checkInDate"],
}).refine((data) => {
  const limit = new Date(data.checkInDate);
  limit.setFullYear(limit.getFullYear() + 2);
  return data.checkOutDate <= limit;
}, {
  message: "Please contact us directly for stays longer than two years out",
  path: ["checkOutDate"],
});

export type GuestFormValues = z.infer<typeof GuestSchema>;
export type ReservationFormValues = z.infer<typeof ReservationSchema>;
export type AvailabilityValues = z.infer<typeof AvailabilitySchema>;
