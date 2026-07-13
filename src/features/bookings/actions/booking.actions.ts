"use server";

import { z } from "zod";
import { BookingService } from "../services/booking.service";
import { BookingSchema, BookingFormValues } from "../validations/booking.schema";

export async function createBookingAction(data: BookingFormValues) {
  try {
    const parsedData = BookingSchema.parse(data);
    const booking = await BookingService.createBooking(parsedData);
    
    return { success: true, booking };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}
