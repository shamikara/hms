import { z } from "zod";

/**
 * Contact details shown across the public site and used for booking alerts.
 *
 * `phone` is the dialable form (tel: links, structured data); `phoneDisplay`
 * is what a reader sees. Kept separate so spacing for humans never ends up in
 * a link a phone has to parse.
 */
export const ContactSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[0-9]{7,15}$/, "Dialable phone: + and country code, digits only (e.g. +94777320237)"),
  phoneDisplay: z.string().trim().min(5, "Phone as shown on the site is required").max(30),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(254),
  /**
   * Where new-booking alerts go. Blank means the public email above — set it
   * only when alerts should reach someone other than the public inbox.
   */
  alertEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address, or leave blank")
    .max(254)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  street: z.string().trim().min(3, "Street is required").max(120),
  locality: z.string().trim().min(2, "Town is required").max(60),
  region: z.string().trim().min(2, "Province is required").max(60),
  postalCode: z.string().trim().min(3, "Postal code is required").max(12),
});

/** One booking platform's published score, copied from that platform. */
export const RatingSchema = z
  .object({
    platform: z.string().trim().min(2, "Platform name is required").max(40),
    score: z.coerce.number().min(0, "Score cannot be negative"),
    outOf: z.coerce.number().refine((v) => v === 5 || v === 10, "Out of must be 5 or 10"),
    count: z.coerce.number().int().min(0, "Review count cannot be negative"),
  })
  .refine((r) => r.score <= r.outOf, {
    message: "Score cannot be higher than the scale",
    path: ["score"],
  });

export const RatingsSchema = z.array(RatingSchema).max(8, "Up to eight platforms");

/**
 * Tax applied to charges on guest bills, as a percentage. Null clears it,
 * which bills read as "tax not configured" rather than zero.
 */
export const TaxSchema = z.object({
  taxPercent: z
    .union([z.number(), z.string()])
    .transform((value, ctx) => {
      if (value === "") return null;
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
        ctx.addIssue({ code: "custom", message: "Enter a percentage from 0 to 100, or leave blank" });
        return z.NEVER;
      }
      return parsed;
    })
    .nullable(),
});

/** Where the "How was your stay?" email sends guests. Blank = not shown. */
const reviewUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Review links must start with https://")
  .transform((v) => v || undefined)
  .optional();

export const ReviewLinksSchema = z.object({
  enabled: z.boolean().default(true),
  google: reviewUrl,
  bookingCom: reviewUrl,
  tripadvisor: reviewUrl,
});

export type ReviewLinks = z.infer<typeof ReviewLinksSchema>;

export type ContactValues = z.infer<typeof ContactSchema>;
export type RatingValues = z.infer<typeof RatingSchema>;
