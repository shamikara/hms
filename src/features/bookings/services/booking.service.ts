import { BookingRepository } from "../repositories/booking.repository";
import { BookingFormValues } from "../validations/booking.schema";

export const BookingService = {
  async createBooking(data: BookingFormValues) {
    // 1. Check for room availability to prevent double-booking
    const conflictingBookings = await BookingRepository.findConflictingBookings(
      data.roomIds,
      data.checkInDate,
      data.checkOutDate
    );

    if (conflictingBookings.length > 0) {
      throw new Error("One or more selected rooms are not available for the chosen dates.");
    }

    // 2. Calculate total amount
    const totalAmount = await BookingRepository.calculateTotalAmount(
      data.roomIds,
      data.checkInDate,
      data.checkOutDate
    );

    // 3. Create the booking transaction
    const booking = await BookingRepository.createBooking({
      ...data,
      totalAmount,
    });

    return booking;
  },
};
