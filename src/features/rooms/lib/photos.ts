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
  { src: "/pool-day.webp", label: "Pool by day" },
  { src: "/pool-loungers.webp", label: "Pool loungers" },
  { src: "/property-verandah-day.webp", label: "Verandah by day" },
  { src: "/property-garden.webp", label: "Garden" },
] as const;

export type RoomPhoto = (typeof ROOM_PHOTOS)[number]["src"];

export const ROOM_PHOTO_FALLBACK: RoomPhoto = "/room-detail.webp";

const ALLOWED = new Set<string>(ROOM_PHOTOS.map((p) => p.src));

export function isRoomPhoto(value: unknown): value is RoomPhoto {
  return typeof value === "string" && ALLOWED.has(value);
}
