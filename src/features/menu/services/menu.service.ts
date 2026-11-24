import { unstable_cache } from "next/cache";
import { MealPeriod, Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";
import type { DishValues, SetMenuValues } from "../validations/menu.schema";

export const MENU_TAG = "daily-menu";
const MEAL_ORDER: MealPeriod[] = ["BREAKFAST", "LUNCH", "DINNER", "ALL_DAY"];

export interface DishRow {
  id: string;
  name: string;
  description: string | null;
  meal: MealPeriod;
  price: number | null;
  vegetarian: boolean;
  spicy: boolean;
  imageUrl: string | null;
}

export interface MenuDay {
  date: string;
  items: { dishId: string; soldOut: boolean }[];
}

export interface PublicMenuDish {
  name: string;
  description: string | null;
  price: number | null;
  vegetarian: boolean;
  spicy: boolean;
  soldOut: boolean;
  imageUrl: string | null;
}
export interface PublicMenu {
  date: string;
  currency: string;
  meals: { meal: MealPeriod; dishes: PublicMenuDish[] }[];
}

/** Today's date in Sri Lanka, "YYYY-MM-DD". The kitchen's day, not the server's. */
export function colomboToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDay(day: string, by: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}

const asDate = (day: string) => new Date(`${day}T00:00:00Z`);

function toDishRow(d: {
  id: string;
  name: string;
  description: string | null;
  meal: MealPeriod;
  price: Prisma.Decimal | null;
  vegetarian: boolean;
  spicy: boolean;
  imageUrl: string | null;
}): DishRow {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    meal: d.meal,
    price: d.price === null ? null : Number(d.price),
    vegetarian: d.vegetarian,
    spicy: d.spicy,
    imageUrl: d.imageUrl,
  };
}

export const MenuService = {
  async currency(propertyId: string): Promise<string> {
    const p = await prisma.property.findUnique({ where: { id: propertyId }, select: { baseCurrency: true } });
    return p?.baseCurrency || "LKR";
  },

  async listDishes(propertyId: string): Promise<DishRow[]> {
    const rows = await prisma.dish.findMany({
      where: { propertyId, archivedAt: null },
      orderBy: [{ meal: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
    return rows.map(toDishRow);
  },

  async getDay(propertyId: string, day: string): Promise<MenuDay> {
    const rows = await prisma.dailyMenuItem.findMany({
      where: { propertyId, date: asDate(day), dish: { archivedAt: null } },
      select: { dishId: true, soldOut: true },
    });
    return { date: day, items: rows };
  },

  async createDish(propertyId: string, values: DishValues): Promise<DishRow> {
    const last = await prisma.dish.aggregate({
      where: { propertyId, meal: values.meal },
      _max: { sortOrder: true },
    });
    const dish = await prisma.dish.create({
      data: {
        propertyId,
        name: values.name,
        description: values.description ?? null,
        meal: values.meal,
        price: values.price,
        vegetarian: values.vegetarian,
        spicy: values.spicy,
        imageUrl: values.imageUrl,
        sortOrder: (last._max.sortOrder ?? 0) + 10,
      },
    });
    return toDishRow(dish);
  },

  /** Returns false when the dish is not this property's. */
  async updateDish(propertyId: string, id: string, values: DishValues): Promise<boolean> {
    const result = await prisma.dish.updateMany({
      where: { id, propertyId, archivedAt: null },
      data: {
        name: values.name,
        description: values.description ?? null,
        meal: values.meal,
        price: values.price,
        vegetarian: values.vegetarian,
        spicy: values.spicy,
        imageUrl: values.imageUrl,
      },
    });
    return result.count === 1;
  },

  /**
   * Archive rather than delete: past menus keep their history. It also comes
   * off any future day it was ticked for, so it cannot linger on the site.
   */
  async archiveDish(propertyId: string, id: string, today: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const result = await tx.dish.updateMany({
        where: { id, propertyId, archivedAt: null },
        data: { archivedAt: new Date() },
      });
      if (result.count !== 1) return false;
      await tx.dailyMenuItem.deleteMany({ where: { propertyId, dishId: id, date: { gte: asDate(today) } } });
      return true;
    });
  },

  /**
   * Replace a day's menu with exactly these dishes. Dish ids that are not this
   * property's (or are archived) are ignored rather than trusted.
   */
  async setDay(propertyId: string, values: SetMenuValues): Promise<number> {
    const date = asDate(values.date);
    const ids = [...new Set(values.items.map((i) => i.dishId))];
    return prisma.$transaction(async (tx) => {
      const valid = await tx.dish.findMany({
        where: { propertyId, archivedAt: null, id: { in: ids } },
        select: { id: true },
      });
      const ok = new Set(valid.map((d) => d.id));
      const soldOut = new Map(values.items.map((i) => [i.dishId, i.soldOut]));
      await tx.dailyMenuItem.deleteMany({ where: { propertyId, date } });
      const data = [...ok].map((dishId) => ({ propertyId, date, dishId, soldOut: soldOut.get(dishId) ?? false }));
      if (data.length) await tx.dailyMenuItem.createMany({ data });
      return data.length;
    });
  },

  /** What the public page shows for a day: on the menu, grouped by meal. */
  async loadPublicMenu(day: string): Promise<PublicMenu | null> {
    const property = await prisma.property.findFirst({
      where: { deletedAt: null },
      select: { id: true, baseCurrency: true },
      orderBy: { createdAt: "asc" },
    });
    if (!property) return null;
    const rows = await prisma.dailyMenuItem.findMany({
      where: { propertyId: property.id, date: asDate(day), dish: { archivedAt: null } },
      select: { soldOut: true, dish: true },
    });
    if (!rows.length) return null;
    rows.sort((a, b) => a.dish.sortOrder - b.dish.sortOrder || a.dish.name.localeCompare(b.dish.name));
    const meals = MEAL_ORDER.map((meal) => ({
      meal,
      dishes: rows
        .filter((r) => r.dish.meal === meal)
        .map((r) => ({
          name: r.dish.name,
          description: r.dish.description,
          price: r.dish.price === null ? null : Number(r.dish.price),
          vegetarian: r.dish.vegetarian,
          spicy: r.dish.spicy,
          soldOut: r.soldOut,
          imageUrl: r.dish.imageUrl,
        })),
    })).filter((m) => m.dishes.length > 0);
    return { date: day, currency: property.baseCurrency || "LKR", meals };
  },
};

const cachedPublicMenu = unstable_cache((day: string) => MenuService.loadPublicMenu(day), ["daily-menu-v2"], {
  tags: [MENU_TAG],
  revalidate: 600,
});

/**
 * Today's menu for the Food page. Cached per day and cleared when staff save.
 * Never throws: with no database the page simply shows no menu.
 */
export async function getTodaysMenu(): Promise<PublicMenu | null> {
  try {
    return await cachedPublicMenu(colomboToday());
  } catch (error) {
    console.error("getTodaysMenu failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
