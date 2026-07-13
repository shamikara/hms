"use server";

import { z } from "zod";
import { SafariService } from "../services/safari.service";
import { SafariScheduleSchema, SafariScheduleFormValues } from "../validations/safari.schema";

export async function createSafariScheduleAction(data: SafariScheduleFormValues) {
  try {
    const parsedData = SafariScheduleSchema.parse(data);
    const schedule = await SafariService.scheduleGameDrive(parsedData);
    
    return { success: true, schedule };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred during scheduling." };
  }
}
