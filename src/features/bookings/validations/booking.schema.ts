import { z } from "zod";
import { ReservationStatus } from "@prisma/client";

export const GuestSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
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

export type GuestFormValues = z.infer<typeof GuestSchema>;
export type ReservationFormValues = z.infer<typeof ReservationSchema>;
