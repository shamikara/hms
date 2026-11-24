import { isUploadedMediaUrl } from "@/features/media/lib/media-url";

/**
 * Photos a room type can use on the public site, from the /public folder.
 *
 * A fixed list rather than a free-text path: an admin cannot point the site at
 * a file that does not exist, or at another website. To offer a new photo, add
 * the file to /public and its entry here.
 */
export const ROOM_PHOTOS = [
  { src: "/room-deluxe-double.webp", label: "Deluxe double, bed" },
  { src: "/room-quadruple.webp", label: "Quadruple, two beds" },
  { src: "/room-twin-yellow.webp", label: "Twin room, yellow" },
  { src: "/room-twin-purple.webp", label: "Twin room, purple" },
  { src: "/room-detail.webp", label: "Room detail" },
  { src: "/room-pink-double.webp", label: "Double, pink bedspread" },
  { src: "/room-pink-double-desk.webp", label: "Double with desk, pink" },
  { src: "/room-purple-twin.webp", label: "Twin beds, purple" },
  { src: "/room-welcome-desk.webp", label: "Welcome desk and water" },
  { src: "/pool-day.webp", label: "Pool by day" },
  { src: "/pool-loungers.webp", label: "Pool loungers" },
  { src: "/property-verandah-day.webp", label: "Verandah by day" },
  { src: "/property-garden.webp", label: "Garden" },
] as const;

export type RoomPhoto = (typeof ROOM_PHOTOS)[number]["src"];

export const ROOM_PHOTO_FALLBACK: RoomPhoto = "/room-detail.webp";

const ALLOWED = new Set<string>(ROOM_PHOTOS.map((p) => p.src));

/** A built-in room photo, or one uploaded in Admin > Photos. */
export function isRoomPhoto(value: unknown): value is string {
  return typeof value === "string" && (ALLOWED.has(value) || isUploadedMediaUrl(value));
}
