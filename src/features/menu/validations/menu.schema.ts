import { z } from "zod";
import { MealPeriod } from "@prisma/client";

export const MEALS: { value: MealPeriod; label: string; hint: string }[] = [
  { value: "BREAKFAST", label: "Breakfast", hint: "7:30am – 10:00am" },
  { value: "LUNCH", label: "Lunch", hint: "Cooked to order" },
  { value: "DINNER", label: "Dinner", hint: "Cooked to order" },
  { value: "ALL_DAY", label: "Drinks & all day", hint: "Any time" },
];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const DishSchema = z.object({
  name: z.string().trim().min(2, "Give the dish a name.").max(80, "Keep the name under 80 characters."),
  description: optionalText(200),
  meal: z.nativeEnum(MealPeriod, { message: "Pick a meal." }),
  /** Blank means no price shown (part of the board, or ask). */
  price: z
    .union([z.literal(""), z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000, "That price looks wrong.")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  vegetarian: z.boolean().default(false),
  spicy: z.boolean().default(false),
  /** A photo from the library; blank for none. Checked against the library on save. */
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : null)),
});
export type DishValues = z.infer<typeof DishSchema>;

/** A calendar day, "YYYY-MM-DD". */
export const DaySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Pick a valid date.");

export const SetMenuSchema = z.object({
  date: DaySchema,
  /** Every dish on the menu that day; anything not listed comes off. */
  items: z
    .array(z.object({ dishId: z.string().min(1).max(64), soldOut: z.boolean().default(false) }))
    .max(200),
});
export type SetMenuValues = z.infer<typeof SetMenuSchema>;
