import { unstable_cache } from "next/cache";
import prisma from "@/core/db/prisma";
import { isUploadedMediaUrl } from "../lib/media-url";
import {
  BUILTIN_PHOTOS,
  DEFAULT_FOOD_PHOTOS,
  DEFAULT_GALLERY_PHOTOS,
  DEFAULT_HERO_SLIDES,
  HERO_TRANSITIONS,
  isBuiltinPhoto,
  type FoodPhotoSetting,
  type GalleryPhotoSetting,
  type HeroSlideSetting,
  type SitePhoto,
} from "../lib/builtin";

export const MEDIA_CONTENT_TAG = "media-content";
export const HERO_KEY = "media.heroSlides";
export const FOOD_KEY = "media.foodGallery";
export const GALLERY_KEY = "media.homeGallery";

export interface MediaRow extends SitePhoto {
  id: string;
  path: string;
  bytes: number;
  createdAt: string;
  usedIn: string[];
}

/** Every photo a picker can offer: uploads first, then the built-in set. */
export interface PhotoChoice extends SitePhoto {
  id: string | null;
  uploaded: boolean;
}

async function defaultPropertyId() {
  const p = await prisma.property.findFirst({ where: { deletedAt: null }, select: { id: true }, orderBy: { createdAt: "asc" } });
  return p?.id ?? null;
}

async function readSetting(propertyId: string, key: string): Promise<unknown> {
  const row = await prisma.setting.findFirst({ where: { propertyId, key }, select: { value: true } });
  return row?.value ?? null;
}

async function writeSetting(propertyId: string, key: string, value: object) {
  await prisma.setting.upsert({
    where: { propertyId_key: { propertyId, key } },
    update: { value },
    create: { level: "PROPERTY", propertyId, key, value },
  });
}

/** Sizes of every known photo, built-in and uploaded, keyed by src. */
async function knownPhotos(propertyId: string): Promise<Map<string, SitePhoto>> {
  const uploads = await prisma.mediaAsset.findMany({ where: { propertyId }, select: { url: true, width: true, height: true, alt: true } });
  const map = new Map<string, SitePhoto>(BUILTIN_PHOTOS.map((p) => [p.src, p]));
  for (const u of uploads) map.set(u.url, { src: u.url, width: u.width, height: u.height, alt: u.alt });
  return map;
}

function cleanHero(raw: unknown, known: Map<string, SitePhoto>): HeroSlideSetting[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .filter((s): s is HeroSlideSetting => !!s && typeof s === "object" && known.has((s as HeroSlideSetting).src))
    .map((s) => ({
      src: s.src,
      alt: typeof s.alt === "string" ? s.alt : known.get(s.src)!.alt,
      transition: (HERO_TRANSITIONS as readonly string[]).includes(s.transition) ? s.transition : "fade",
    }));
  return out.length ? out : null;
}

function cleanFood(raw: unknown, known: Map<string, SitePhoto>): FoodPhotoSetting[] | null {
  if (!Array.isArray(raw)) return null;
  return raw
    .filter((s): s is FoodPhotoSetting => !!s && typeof s === "object" && known.has((s as FoodPhotoSetting).src))
    .map((s) => {
      const k = known.get(s.src)!;
      return {
        src: s.src,
        alt: typeof s.alt === "string" && s.alt ? s.alt : k.alt,
        caption: typeof s.caption === "string" ? s.caption : "",
        width: k.width,
        height: k.height,
      };
    });
}

function cleanGallery(raw: unknown, known: Map<string, SitePhoto>): GalleryPhotoSetting[] | null {
  if (!Array.isArray(raw)) return null;
  const out = raw
    .filter((s): s is GalleryPhotoSetting => !!s && typeof s === "object" && known.has((s as GalleryPhotoSetting).src))
    .map((s) => {
      const k = known.get(s.src)!;
      return { src: s.src, alt: typeof s.alt === "string" && s.alt ? s.alt : k.alt, wide: s.wide === true, width: k.width, height: k.height };
    });
  return out.length ? out : null;
}

export interface MediaContent {
  heroSlides: HeroSlideSetting[];
  foodPhotos: FoodPhotoSetting[];
  galleryPhotos: GalleryPhotoSetting[];
}

const DEFAULT_CONTENT: MediaContent = {
  heroSlides: DEFAULT_HERO_SLIDES,
  foodPhotos: DEFAULT_FOOD_PHOTOS,
  galleryPhotos: DEFAULT_GALLERY_PHOTOS,
};

export async function loadMediaContent(): Promise<MediaContent> {
  const propertyId = await defaultPropertyId();
  if (!propertyId) return DEFAULT_CONTENT;
  const [known, hero, food, gallery] = await Promise.all([
    knownPhotos(propertyId),
    readSetting(propertyId, HERO_KEY),
    readSetting(propertyId, FOOD_KEY),
    readSetting(propertyId, GALLERY_KEY),
  ]);
  return {
    heroSlides: cleanHero(hero, known) ?? DEFAULT_HERO_SLIDES,
    galleryPhotos: cleanGallery(gallery, known) ?? DEFAULT_GALLERY_PHOTOS,
    // An empty saved list is a choice (no photo wall); only "never saved" falls back.
    foodPhotos: food === null ? DEFAULT_FOOD_PHOTOS : (cleanFood(food, known) ?? DEFAULT_FOOD_PHOTOS),
  };
}

const cachedMediaContent = unstable_cache(loadMediaContent, ["media-content-v2"], { tags: [MEDIA_CONTENT_TAG], revalidate: 3600 });

/** For public pages. Cached; never throws (falls back to the built-in photos). */
export async function getMediaContent(): Promise<MediaContent> {
  try {
    return await cachedMediaContent();
  } catch (error) {
    console.error("getMediaContent failed:", error instanceof Error ? error.message : error);
    return DEFAULT_CONTENT;
  }
}

export const MediaService = {
  defaultPropertyId,
  knownPhotos,
  readSetting,

  async list(propertyId: string): Promise<MediaRow[]> {
    const [rows, content, roomTypes, drivers, dishes] = await Promise.all([
      prisma.mediaAsset.findMany({ where: { propertyId }, orderBy: { createdAt: "desc" } }),
      loadMediaContent(),
      prisma.roomType.findMany({ where: { propertyId, deletedAt: null }, select: { name: true, imageUrl: true, gallery: true } }),
      prisma.safariDriver
        .findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true, employee: { select: { firstName: true } } } })
        .catch(() => []),
      prisma.dish.findMany({ where: { propertyId, imageUrl: { not: null } }, select: { name: true, imageUrl: true } }).catch(() => []),
    ]);
    return rows.map((r) => {
      const usedIn: string[] = [];
      if (content.heroSlides.some((s) => s.src === r.url)) usedIn.push("Homepage slideshow");
      if (content.foodPhotos.some((s) => s.src === r.url)) usedIn.push("Food page");
      if (content.galleryPhotos.some((s) => s.src === r.url)) usedIn.push("Around the house");
      for (const d of drivers) if (d.imageUrl === r.url) usedIn.push(`Driver: ${d.employee.firstName}`);
      for (const d of dishes) if (d.imageUrl === r.url) usedIn.push(`Dish: ${d.name}`);
      for (const t of roomTypes) if (t.imageUrl === r.url || t.gallery.includes(r.url)) usedIn.push(`Room: ${t.name}`);
      return {
        id: r.id,
        path: r.path,
        src: r.url,
        width: r.width,
        height: r.height,
        alt: r.alt,
        bytes: r.bytes,
        createdAt: r.createdAt.toISOString(),
        usedIn,
      };
    });
  },

  async choices(propertyId: string): Promise<PhotoChoice[]> {
    const uploads = await prisma.mediaAsset.findMany({ where: { propertyId }, orderBy: { createdAt: "desc" } });
    return [
      ...uploads.map((u) => ({ id: u.id, src: u.url, width: u.width, height: u.height, alt: u.alt, uploaded: true })),
      ...BUILTIN_PHOTOS.map((p) => ({ ...p, id: null, uploaded: false })),
    ];
  },

  async saveHero(propertyId: string, slides: HeroSlideSetting[]) {
    const known = await knownPhotos(propertyId);
    const bad = slides.find((s) => !known.has(s.src));
    if (bad) throw new Error("One of the photos is no longer in the library.");
    await writeSetting(propertyId, HERO_KEY, slides);
  },

  async saveFood(propertyId: string, photos: { src: string; alt: string; caption: string }[]) {
    const known = await knownPhotos(propertyId);
    const bad = photos.find((s) => !known.has(s.src));
    if (bad) throw new Error("One of the photos is no longer in the library.");
    await writeSetting(propertyId, FOOD_KEY, photos);
  },

  async saveGallery(propertyId: string, photos: { src: string; alt: string; wide: boolean }[]) {
    const known = await knownPhotos(propertyId);
    const bad = photos.find((s) => !known.has(s.src));
    if (bad) throw new Error("One of the photos is no longer in the library.");
    await writeSetting(propertyId, GALLERY_KEY, photos);
  },

  /** Photo src a room type may use: built-in room photos, or any upload. */
  isAllowedPhoto(src: string) {
    return isBuiltinPhoto(src) || isUploadedMediaUrl(src);
  },
};
