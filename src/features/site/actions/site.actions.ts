"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import {
  NO_PROPERTY,
  requireAdminPermission,
  resolveDefaultPropertyId,
} from "@/features/admin/lib/requireAdminSession";
import { SITE_CONTENT_TAG, SiteSettingsService, type SiteSettings } from "../services/site.service";
import { ContactSchema, RatingsSchema, ReviewLinksSchema, TaxSchema } from "../validations/site.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

function firstIssue(error: z.ZodError): string {
  return error.issues?.[0]?.message ?? "Please check the details and try again.";
}

function fail(context: string, error: unknown): Result<never> {
  console.error(`${context} failed:`, error instanceof Error ? error.message : error);
  return { success: false, error: "That did not save. Please try again." };
}

/** Every public page shows the footer, so a contact change touches them all. */
function refreshPublicPages() {
  updateTag(SITE_CONTENT_TAG);
  revalidatePath("/", "layout");
}

async function guardedProperty() {
  const guard = await requireAdminPermission("settings:manage");
  if (!guard.ok) return { ok: false as const, failure: guard.failure };
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { ok: false as const, failure: { success: false as const, error: NO_PROPERTY } };
  return { ok: true as const, propertyId };
}

export async function getSiteSettings(): Promise<Result<SiteSettings>> {
  const ctx = await guardedProperty();
  if (!ctx.ok) return ctx.failure;
  try {
    return { success: true, data: await SiteSettingsService.read(ctx.propertyId) };
  } catch (error) {
    console.error("getSiteSettings failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Settings could not be loaded. Please try again." };
  }
}

export async function saveContactSettings(input: unknown): Promise<Result> {
  const ctx = await guardedProperty();
  if (!ctx.ok) return ctx.failure;
  const parsed = ContactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await SiteSettingsService.saveContact(ctx.propertyId, parsed.data);
    refreshPublicPages();
    return { success: true };
  } catch (error) {
    return fail("saveContactSettings", error);
  }
}

export async function saveRatingSettings(input: unknown): Promise<Result> {
  const ctx = await guardedProperty();
  if (!ctx.ok) return ctx.failure;
  const parsed = RatingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await SiteSettingsService.saveRatings(ctx.propertyId, parsed.data);
    refreshPublicPages();
    return { success: true };
  } catch (error) {
    return fail("saveRatingSettings", error);
  }
}

export async function saveTaxSetting(input: unknown): Promise<Result> {
  const ctx = await guardedProperty();
  if (!ctx.ok) return ctx.failure;
  const parsed = TaxSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await SiteSettingsService.saveTax(ctx.propertyId, parsed.data.taxPercent);
    // Folios read the rate at the time a charge is posted; nothing public shows it.
    revalidatePath("/admin/bookings", "layout");
    return { success: true };
  } catch (error) {
    return fail("saveTaxSetting", error);
  }
}

export async function saveReviewLinks(input: unknown): Promise<Result> {
  const ctx = await guardedProperty();
  if (!ctx.ok) return ctx.failure;
  const parsed = ReviewLinksSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await SiteSettingsService.saveReviewLinks(ctx.propertyId, parsed.data);
    // Only the checkout email reads these; nothing public to refresh.
    return { success: true };
  } catch (error) {
    return fail("saveReviewLinks", error);
  }
}
