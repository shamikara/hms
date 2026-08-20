import prisma from "@/core/db/prisma";
import { SafariScheduleFormValues } from "../validations/safari.schema";

export const SafariRepository = {
  async findOverlappingSchedules(vehicleId: string, guideId: string, driverId: string, startTime: Date, endTime: Date) {
    return prisma.safariSchedule.findMany({
      where: {
        OR: [
          { vehicleId },
          { guideId },
          { driverId }
        ],
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } }
        ]
      },
      include: {
        vehicle: true,
        guide: true,
        driver: true,
      }
    });
  },

  /**
   * Operational trips (`SafariTrip`) that overlap the window for this vehicle,
   * driver or guide. The fleet module writes occupancy there, so a schedule
   * created here must respect it or the two diaries drift apart.
   */
  async findOverlappingTrips(vehicleId: string, guideId: string, driverEmployeeId: string, startTime: Date, endTime: Date) {
    return prisma.safariTrip.findMany({
      where: {
        status: { not: "CANCELLED" },
        scheduledStart: { lt: endTime },
        scheduledEnd: { gt: startTime },
        OR: [
          { vehicleId },
          { guideId },
          { driver: { employeeId: driverEmployeeId } },
        ],
      },
      include: {
        vehicle: true,
        driver: { include: { employee: true } },
        guide: true,
      }
    });
  },

  async createSchedule(data: SafariScheduleFormValues) {
    return prisma.safariSchedule.create({ 
      data,
      include: {
        vehicle: true,
        route: true,
        guide: true,
        driver: true
      }
    });
  },
};
