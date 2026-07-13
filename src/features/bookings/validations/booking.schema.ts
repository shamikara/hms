import { z } from "zod";
import { BookingStatus } from "@prisma/client";

export const GuestSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  passportNo: z.string().optional(),
  nationality: z.string().optional(),
});

export const BookingSchema = z.object({
  guestId: z.string().cuid("Guest ID is required"),
  roomIds: z.array(z.string().cuid()).min(1, "At least one room must be selected"),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  status: z.nativeEnum(BookingStatus).default(BookingStatus.PENDING),
  notes: z.string().optional(),
}).refine((data) => data.checkOutDate > data.checkInDate, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

export type GuestFormValues = z.infer<typeof GuestSchema>;
export type BookingFormValues = z.infer<typeof BookingSchema>;
