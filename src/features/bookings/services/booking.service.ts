import { BookingRepository } from "../repositories/booking.repository";
import { ReservationFormValues } from "../validations/booking.schema";

export const BookingService = {
  async createReservation(data: ReservationFormValues) {
    // 1. Get all available rooms for the requested types
    const availableRooms = await BookingRepository.getAvailableRooms(
      data.propertyId,
      data.roomTypeIds,
      data.checkInDate,
      data.checkOutDate
    );

    // 2. We need to assign at least one room per requested room type.
    const assignedRoomIds: string[] = [];
    const missingRoomTypes: string[] = [];

    // Group available rooms by type to easily pick one
    const roomsByType = availableRooms.reduce((acc, room) => {
      if (!acc[room.roomTypeId]) acc[room.roomTypeId] = [];
      acc[room.roomTypeId].push(room.id);
      return acc;
    }, {} as Record<string, string[]>);

    // Pick one room for each requested type
    for (const typeId of data.roomTypeIds) {
      if (roomsByType[typeId] && roomsByType[typeId].length > 0) {
        // Pop an available room so it's not double-assigned if the same type is requested twice
        assignedRoomIds.push(roomsByType[typeId].pop()!);
      } else {
        missingRoomTypes.push(typeId);
      }
    }

    if (missingRoomTypes.length > 0) {
      throw new Error("One or more requested room types are not available for these dates.");
    }

    // 3. Create the Reservation
    const reservation = await BookingRepository.createReservation(data, assignedRoomIds);
    return reservation;
  },
};
