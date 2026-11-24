import { z } from "zod";
import { HERO_TRANSITIONS } from "../lib/builtin";

const alt = z.string().trim().max(200, "Keep the description under 200 characters.");

export const HeroSlidesSchema = z
  .array(z.object({ src: z.string().min(1).max(500), alt, transition: z.enum(HERO_TRANSITIONS) }))
  .min(1, "Keep at least one photo in the slideshow.")
  .max(10, "Up to 10 photos in the slideshow.");

export const FoodPhotosSchema = z
  .array(
    z.object({
      src: z.string().min(1).max(500),
      alt,
      caption: z.string().trim().max(80, "Keep captions under 80 characters."),
    }),
  )
  .max(16, "Up to 16 photos on the Food page.");

export const MediaAltSchema = z.object({ id: z.string().min(1).max(64), alt });

export const GalleryPhotosSchema = z
  .array(z.object({ src: z.string().min(1).max(500), alt, wide: z.boolean() }))
  .min(3, "Keep at least 3 photos so the strip can loop.")
  .max(20, "Up to 20 photos in the strip.");
