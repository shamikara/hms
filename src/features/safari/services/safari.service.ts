import { SafariRepository } from "../repositories/safari.repository";
import { SafariScheduleFormValues } from "../validations/safari.schema";

export const SafariService = {
  async scheduleGameDrive(data: SafariScheduleFormValues) {
    // 1. Prevent double-booking for the Vehicle, Guide, and Driver
    const overlaps = await SafariRepository.findOverlappingSchedules(
      data.vehicleId,
      data.guideId,
      data.driverId,
      data.startTime,
      data.endTime
    );

    if (overlaps.length > 0) {
      const conflict = overlaps[0];
      let reason = "An unknown conflict occurred.";
      
      if (conflict.vehicleId === data.vehicleId) {
        reason = `Vehicle ${conflict.vehicle.plateNumber} is already scheduled during this time.`;
      } else if (conflict.guideId === data.guideId) {
        reason = `Guide ${conflict.guide.firstName} ${conflict.guide.lastName} is already assigned to a game drive during this time.`;
      } else if (conflict.driverId === data.driverId) {
        reason = `Driver ${conflict.driver.firstName} ${conflict.driver.lastName} is already assigned to a game drive during this time.`;
      }

      throw new Error(`Scheduling Conflict: ${reason}`);
    }

    // 2. Prevent double-booking against operational trips created by the fleet
    //    module, which is the authoritative occupancy record for vehicles and
    //    drivers. Without this, a game drive could be scheduled on top of a
    //    safari that is already dispatched.
    const tripOverlaps = await SafariRepository.findOverlappingTrips(
      data.vehicleId,
      data.guideId,
      data.driverId,
      data.startTime,
      data.endTime
    );

    if (tripOverlaps.length > 0) {
      const trip = tripOverlaps[0];
      let reason = "A dispatched safari overlaps this time.";

      if (trip.vehicleId === data.vehicleId) {
        reason = `Vehicle ${trip.vehicle.plateNumber} is already dispatched on "${trip.destination}" during this time.`;
      } else if (trip.guideId === data.guideId && trip.guide) {
        reason = `Guide ${trip.guide.firstName} ${trip.guide.lastName} is already dispatched on "${trip.destination}" during this time.`;
      } else if (trip.driver.employeeId === data.driverId) {
        reason = `Driver ${trip.driver.employee.firstName} ${trip.driver.employee.lastName} is already dispatched on "${trip.destination}" during this time.`;
      }

      throw new Error(`Scheduling Conflict: ${reason}`);
    }

    // 3. Create the schedule
    return SafariRepository.createSchedule(data);
  }
};
