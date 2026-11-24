"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { NO_PROPERTY, requireAdminPermission, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { MENU_TAG, MenuService, colomboToday, shiftDay, type DishRow, type MenuDay } from "../services/menu.service";
import { DaySchema, DishSchema, SetMenuSchema } from "../validations/menu.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

const firstIssue = (error: z.ZodError) => error.issues?.[0]?.message ?? "Please check the details and try again.";

function refreshMenu() {
  updateTag(MENU_TAG);
  revalidatePath("/dining");
  revalidatePath("/admin/menu");
}

export interface MenuBoardData {
  dishes: DishRow[];
  day: MenuDay;
  previous: MenuDay;
  today: string;
  currency: string;
}

export async function loadMenuBoard(day?: string): Promise<Result<MenuBoardData>> {
  const guard = await requireAdminPermission("menu:manage");
  if (!guard.ok) return guard.failure;
  const today = colomboToday();
  const parsedDay = DaySchema.safeParse(day);
  const date = parsedDay.success ? parsedDay.data : today;
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const [dishes, current, previous, currency] = await Promise.all([
      MenuService.listDishes(propertyId),
      MenuService.getDay(propertyId, date),
      MenuService.getDay(propertyId, shiftDay(date, -1)),
      MenuService.currency(propertyId),
    ]);
    return { success: true, data: { dishes, day: current, previous, today, currency } };
  } catch (error) {
    console.error("loadMenuBoard failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "The menu could not be loaded. Please try again." };
  }
}

export async function saveDayMenu(input: unknown): Promise<Result<{ count: number }>> {
  const guard = await requireAdminPermission("menu:manage");
  if (!guard.ok) return guard.failure;
  const parsed = SetMenuSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const count = await MenuService.setDay(propertyId, parsed.data);
    refreshMenu();
    return { success: true, data: { count } };
  } catch (error) {
    console.error("saveDayMenu failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "The menu did not save. Please try again." };
  }
}

export async function createDish(input: unknown): Promise<Result<DishRow>> {
  const guard = await requireAdminPermission("menu:manage");
  if (!guard.ok) return guard.failure;
  const parsed = DishSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const dish = await MenuService.createDish(propertyId, parsed.data);
    revalidatePath("/admin/menu");
    return { success: true, data: dish };
  } catch (error) {
    console.error("createDish failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "The dish did not save. Please try again." };
  }
}

export async function updateDish(id: string, input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("menu:manage");
  if (!guard.ok) return guard.failure;
  const parsed = DishSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  if (!z.string().min(1).max(64).safeParse(id).success) return { success: false, error: "That dish was not found." };
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const ok = await MenuService.updateDish(propertyId, id, parsed.data);
    if (!ok) return { success: false, error: "That dish was not found." };
    refreshMenu();
    return { success: true };
  } catch (error) {
    console.error("updateDish failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "The dish did not save. Please try again." };
  }
}

export async function archiveDish(id: string): Promise<Result> {
  const guard = await requireAdminPermission("menu:manage");
  if (!guard.ok) return guard.failure;
  if (!z.string().min(1).max(64).safeParse(id).success) return { success: false, error: "That dish was not found." };
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const ok = await MenuService.archiveDish(propertyId, id, colomboToday());
    if (!ok) return { success: false, error: "That dish was not found." };
    refreshMenu();
    return { success: true };
  } catch (error) {
    console.error("archiveDish failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not work. Please try again." };
  }
}
