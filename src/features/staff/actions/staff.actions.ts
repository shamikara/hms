"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  NO_PROPERTY,
  requireAdminPermission,
  resolveDefaultPropertyId,
} from "@/features/admin/lib/requireAdminSession";
import { StaffError, StaffService, type StaffMember } from "../services/staff.service";
import {
  CreateStaffSchema,
  ResetPasswordSchema,
  SetActiveSchema,
  UpdateStaffSchema,
} from "../validations/staff.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

function firstIssue(error: z.ZodError): string {
  return error.issues?.[0]?.message ?? "Please check the details and try again.";
}

function fail(context: string, error: unknown): Result<never> {
  if (error instanceof StaffError) return { success: false, error: error.message };
  console.error(`${context} failed:`, error instanceof Error ? error.message : error);
  return { success: false, error: "That did not save. Please try again." };
}

async function context() {
  const guard = await requireAdminPermission("staff:manage");
  if (!guard.ok) return { ok: false as const, failure: guard.failure };
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { ok: false as const, failure: { success: false as const, error: NO_PROPERTY } };
  return {
    ok: true as const,
    propertyId,
    actor: { userId: guard.actor.userId, roles: guard.actor.roles },
  };
}

export async function listStaff(): Promise<Result<StaffMember[]>> {
  const ctx = await context();
  if (!ctx.ok) return ctx.failure;
  try {
    return { success: true, data: await StaffService.list(ctx.propertyId, ctx.actor) };
  } catch (error) {
    console.error("listStaff failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Staff could not be loaded. Please try again." };
  }
}

export async function createStaff(input: unknown): Promise<Result> {
  const ctx = await context();
  if (!ctx.ok) return ctx.failure;
  const parsed = CreateStaffSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await StaffService.create(ctx.propertyId, ctx.actor, parsed.data);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    return fail("createStaff", error);
  }
}

export async function updateStaff(input: unknown): Promise<Result> {
  const ctx = await context();
  if (!ctx.ok) return ctx.failure;
  const parsed = UpdateStaffSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await StaffService.update(ctx.propertyId, ctx.actor, parsed.data);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    return fail("updateStaff", error);
  }
}

export async function resetStaffPassword(input: unknown): Promise<Result> {
  const ctx = await context();
  if (!ctx.ok) return ctx.failure;
  const parsed = ResetPasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await StaffService.resetPassword(ctx.propertyId, ctx.actor, parsed.data.employeeId, parsed.data.password);
    return { success: true };
  } catch (error) {
    return fail("resetStaffPassword", error);
  }
}

export async function setStaffActive(input: unknown): Promise<Result> {
  const ctx = await context();
  if (!ctx.ok) return ctx.failure;
  const parsed = SetActiveSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await StaffService.setActive(ctx.propertyId, ctx.actor, parsed.data.employeeId, parsed.data.active);
    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    return fail("setStaffActive", error);
  }
}
