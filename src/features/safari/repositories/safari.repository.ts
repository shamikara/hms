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
