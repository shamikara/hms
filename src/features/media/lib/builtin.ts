/**
 * Photos that ship with the site (in /public). They are the defaults until an
 * admin chooses others, and stay available in every photo picker.
 */
export interface SitePhoto {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export const HERO_TRANSITIONS = ["fade", "wipe", "iris", "split", "push", "zoom"] as const;
export type HeroTransitionName = (typeof HERO_TRANSITIONS)[number];

export interface HeroSlideSetting {
  src: string;
  alt: string;
  transition: HeroTransitionName;
}

export interface FoodPhotoSetting {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

export interface GalleryPhotoSetting {
  src: string;
  alt: string;
  /** Shown as a wide card in the homepage strip. */
  wide: boolean;
  width: number;
  height: number;
}

export const BUILTIN_PHOTOS: SitePhoto[] = [
  { src: "/hero/hero-pool-pergola.webp", width: 1600, height: 1000, alt: "The pool and thatched pergola under a blue sky" },
  { src: "/hero/hero-garden-path.webp", width: 1280, height: 800, alt: "The garden path leading down to the pool" },
  { src: "/hero/hero-elephant-herd.webp", width: 1600, height: 1000, alt: "A herd of wild elephants grazing in Udawalawe National Park" },
  { src: "/hero/hero-pool-frangipani.webp", width: 1600, height: 1000, alt: "Frangipani in bloom beside the pool" },
  { src: "/hero/hero-pool-above.webp", width: 1600, height: 1000, alt: "The pool and garden seen from above" },
  { src: "/hero/hero-pool-night.webp", width: 1280, height: 800, alt: "The pool lit up at night under the trees" },
  { src: "/food/food-string-hoppers.webp", width: 1000, height: 725, alt: "A platter of string hoppers, hoppers, rice and curries on banana leaf" },
  { src: "/food/food-rice-curry-banana-leaf.webp", width: 900, height: 1200, alt: "Rice, hoppers and several curries in clay bowls on a banana leaf" },
  { src: "/food/food-breakfast-table.webp", width: 1000, height: 750, alt: "Omelette, toast, fruit and tea on a wooden table" },
  { src: "/food/food-curries-roti.webp", width: 900, height: 1200, alt: "Curries in clay pots with roti and red rice" },
  { src: "/food/food-kola-kanda.webp", width: 900, height: 1200, alt: "A bowl of green kola kanda herbal porridge with curry leaves" },
  { src: "/food/food-clay-pots.webp", width: 1000, height: 750, alt: "Rice and colourful curries served in clay pots" },
  { src: "/food/food-curries-basket.webp", width: 900, height: 1200, alt: "A woven basket of rice and curries in clay bowls" },
  { src: "/food/food-hero-breakfast-pool.webp", width: 1600, height: 1200, alt: "Breakfast served at a table beside the pool" },
  { src: "/food/food-tea-garden.webp", width: 1200, height: 900, alt: "Tea served at a table overlooking the garden and pool" },
  { src: "/pool-garden-day.webp", width: 1280, height: 707, alt: "The pool in the garden by day" },
  { src: "/wildlife-peacock.webp", width: 854, height: 1280, alt: "A peacock displaying" },
  { src: "/safari-elephant-calf-grass.webp", width: 960, height: 1280, alt: "An elephant and calf in the park" },
  { src: "/garden-night-steps.webp", width: 960, height: 1280, alt: "The garden and steps lit at night" },
  { src: "/room-pink-double.webp", width: 1024, height: 768, alt: "A double room with a pink bedspread" },
  { src: "/safari-breakfast-park.webp", width: 720, height: 1280, alt: "Breakfast laid out during a safari" },
  { src: "/pool-from-above.webp", width: 848, height: 1280, alt: "The pool seen from above" },
  { src: "/wildlife-green-pigeon.webp", width: 1018, height: 1018, alt: "A green pigeon in a tree" },
  { src: "/drivers/manjula.webp", width: 400, height: 400, alt: "Manjula, safari driver, beside his jeep" },
  { src: "/room-deluxe-double.webp", width: 2000, height: 1335, alt: "Deluxe double room with a queen bed" },
  { src: "/room-quadruple.webp", width: 1800, height: 1350, alt: "Quadruple room with two beds" },
  { src: "/room-twin-yellow.webp", width: 1280, height: 852, alt: "Twin room with yellow bedding" },
  { src: "/room-twin-purple.webp", width: 1280, height: 852, alt: "Twin room with purple bedding" },
  { src: "/room-detail.webp", width: 1600, height: 1068, alt: "Detail of a guest room" },
  { src: "/room-pink-double-desk.webp", width: 1280, height: 754, alt: "Double room with a desk and pink bedspread" },
  { src: "/room-purple-twin.webp", width: 1280, height: 720, alt: "Twin beds with purple covers" },
  { src: "/room-welcome-desk.webp", width: 1280, height: 720, alt: "Welcome desk with bottled water" },
  { src: "/pool-day.webp", width: 1024, height: 768, alt: "The pool by day" },
  { src: "/pool-loungers.webp", width: 1800, height: 1202, alt: "Loungers beside the pool" },
  { src: "/property-verandah-day.webp", width: 1800, height: 1202, alt: "The verandah by day" },
  { src: "/property-garden.webp", width: 1280, height: 960, alt: "The garden" },
];

const builtin = (src: string) => BUILTIN_PHOTOS.find((p) => p.src === src)!;
const galleryItem = (src: string, wide = false): GalleryPhotoSetting => {
  const p = builtin(src);
  return { src, alt: p.alt, wide, width: p.width, height: p.height };
};

/** The homepage "Around the house" strip until an admin changes it. */
export const DEFAULT_GALLERY_PHOTOS: GalleryPhotoSetting[] = [
  galleryItem("/pool-garden-day.webp", true),
  galleryItem("/wildlife-peacock.webp"),
  galleryItem("/safari-elephant-calf-grass.webp"),
  galleryItem("/garden-night-steps.webp"),
  galleryItem("/room-pink-double.webp", true),
  galleryItem("/safari-breakfast-park.webp"),
  galleryItem("/pool-from-above.webp"),
  galleryItem("/wildlife-green-pigeon.webp"),
];

export const DEFAULT_HERO_SLIDES: HeroSlideSetting[] = [
  { src: "/hero/hero-pool-pergola.webp", alt: "The pool and thatched pergola under a blue sky", transition: "fade" },
  { src: "/hero/hero-garden-path.webp", alt: "The garden path leading down to the pool", transition: "wipe" },
  { src: "/hero/hero-elephant-herd.webp", alt: "A herd of wild elephants grazing in Udawalawe National Park", transition: "iris" },
  { src: "/hero/hero-pool-frangipani.webp", alt: "Frangipani in bloom beside the pool", transition: "push" },
  { src: "/hero/hero-pool-above.webp", alt: "The pool and garden seen from above", transition: "split" },
  { src: "/hero/hero-pool-night.webp", alt: "The pool lit up at night under the trees", transition: "zoom" },
];

export const DEFAULT_FOOD_PHOTOS: FoodPhotoSetting[] = [
  { src: "/food/food-string-hoppers.webp", width: 1000, height: 725, caption: "String hoppers and hoppers with curries", alt: "A platter of string hoppers, hoppers, rice and curries on banana leaf" },
  { src: "/food/food-rice-curry-banana-leaf.webp", width: 900, height: 1200, caption: "Rice and curry, Sri Lankan style", alt: "Rice, hoppers and several curries in clay bowls on a banana leaf" },
  { src: "/food/food-breakfast-table.webp", width: 1000, height: 750, caption: "Breakfast by the pool", alt: "Omelette, toast, fruit and tea on a wooden table" },
  { src: "/food/food-curries-roti.webp", width: 900, height: 1200, caption: "Curries with roti and red rice", alt: "Curries in clay pots with roti and red rice" },
  { src: "/food/food-kola-kanda.webp", width: 900, height: 1200, caption: "Kola kanda, a herbal porridge", alt: "A bowl of green kola kanda herbal porridge with curry leaves" },
  { src: "/food/food-clay-pots.webp", width: 1000, height: 750, caption: "Rice and curries in clay pots", alt: "Rice and colourful curries served in clay pots" },
  { src: "/food/food-curries-basket.webp", width: 900, height: 1200, caption: "A spread of curries", alt: "A woven basket of rice and curries in clay bowls" },
];

const BUILTIN_SET = new Set(BUILTIN_PHOTOS.map((p) => p.src));
export function isBuiltinPhoto(src: unknown): src is string {
  return typeof src === "string" && BUILTIN_SET.has(src);
}
