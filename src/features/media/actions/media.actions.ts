"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import prisma from "@/core/db/prisma";
import { NO_PROPERTY, requireAdminPermission, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { deleteObject, isStorageConfigured } from "../lib/storage";
import { MEDIA_CONTENT_TAG, MediaService, loadMediaContent, type MediaContent, type MediaRow, type PhotoChoice } from "../services/media.service";
import { FoodPhotosSchema, HeroSlidesSchema, MediaAltSchema } from "../validations/media.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };
const firstIssue = (e: z.ZodError) => e.issues?.[0]?.message ?? "Please check the details and try again.";

async function ctx() {
  const guard = await requireAdminPermission("media:manage");
  if (!guard.ok) return { ok: false as const, failure: guard.failure };
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { ok: false as const, failure: { success: false as const, error: NO_PROPERTY } };
  return { ok: true as const, propertyId };
}

function refreshPublic() {
  updateTag(MEDIA_CONTENT_TAG);
  revalidatePath("/");
  revalidatePath("/dining");
  revalidatePath("/admin/media");
}

export interface MediaBoardData {
  library: MediaRow[];
  choices: PhotoChoice[];
  content: MediaContent;
  storageReady: boolean;
}

export async function loadMediaBoard(): Promise<Result<MediaBoardData>> {
  const c = await ctx();
  if (!c.ok) return c.failure;
  try {
    const [library, choices, content] = await Promise.all([
      MediaService.list(c.propertyId),
      MediaService.choices(c.propertyId),
      loadMediaContent(),
    ]);
    return { success: true, data: { library, choices, content, storageReady: isStorageConfigured() } };
  } catch (error) {
    console.error("loadMediaBoard failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Photos could not be loaded. Please try again." };
  }
}

export async function saveHeroSlides(input: unknown): Promise<Result> {
  const c = await ctx();
  if (!c.ok) return c.failure;
  const parsed = HeroSlidesSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await MediaService.saveHero(c.propertyId, parsed.data);
    refreshPublic();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "That did not save." };
  }
}

export async function saveFoodPhotos(input: unknown): Promise<Result> {
  const c = await ctx();
  if (!c.ok) return c.failure;
  const parsed = FoodPhotosSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    await MediaService.saveFood(c.propertyId, parsed.data);
    refreshPublic();
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "That did not save." };
  }
}

export async function updateMediaAlt(input: unknown): Promise<Result> {
  const c = await ctx();
  if (!c.ok) return c.failure;
  const parsed = MediaAltSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const r = await prisma.mediaAsset.updateMany({ where: { id: parsed.data.id, propertyId: c.propertyId }, data: { alt: parsed.data.alt } });
  if (r.count !== 1) return { success: false, error: "That photo was not found." };
  revalidatePath("/admin/media");
  return { success: true };
}

/** Deletes a photo, unless the website is still showing it somewhere. */
export async function deleteMedia(id: string): Promise<Result> {
  const c = await ctx();
  if (!c.ok) return c.failure;
  if (!z.string().min(1).max(64).safeParse(id).success) return { success: false, error: "That photo was not found." };
  const row = (await MediaService.list(c.propertyId)).find((m) => m.id === id);
  if (!row) return { success: false, error: "That photo was not found." };
  if (row.usedIn.length) {
    return { success: false, error: `Still in use (${row.usedIn.join(", ")}). Remove it from there first.` };
  }
  try {
    await deleteObject(row.path);
    await prisma.mediaAsset.delete({ where: { id } });
    revalidatePath("/admin/media");
    return { success: true };
  } catch (error) {
    console.error("deleteMedia failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "The photo could not be deleted. Please try again." };
  }
}
