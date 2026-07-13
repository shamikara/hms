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

    // 2. Create the schedule
    return SafariRepository.createSchedule(data);
  }
};
