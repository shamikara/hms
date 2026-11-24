import { unstable_cache } from "next/cache";
import prisma from "@/core/db/prisma";
import { ROOM_PHOTO_FALLBACK, isRoomPhoto } from "../lib/photos";

/** Cache tag for everything the public pages read about rooms. */
export const PUBLIC_ROOMS_TAG = "public-rooms";

export interface PublicRoomType {
  id: string;
  name: string;
  description: string | null;
  capacity: number;
  /** Nightly rate, or null for rate on request. */
  basePrice: number | null;
  imageUrl: string;
  features: string[];
  /** Rooms of this type that can be sold now (not under maintenance). */
  sellableRooms: number;
}

export interface PublicRooms {
  currencyCode: string;
  /** Only types with at least one room on sale; renovations drop out. */
  roomTypes: PublicRoomType[];
  /** Sellable rooms across every type: the "how many rooms" figure. */
  totalSellableRooms: number;
}

const EMPTY: PublicRooms = { currencyCode: "LKR", roomTypes: [], totalSellableRooms: 0 };

/** Uncached read; exported for scripts and tests. Pages use getPublicRooms. */
export async function loadPublicRooms(): Promise<PublicRooms> {
  const property = await prisma.property.findFirst({
    where: { deletedAt: null },
    select: { id: true, baseCurrency: true },
    orderBy: { createdAt: "asc" },
  });
  if (!property) return EMPTY;

  // Same reachability rule as the booking search: a room counts only if it is
  // AVAILABLE and sits on a floor of a building of this property.
  const types = await prisma.roomType.findMany({
    where: { propertyId: property.id, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      capacity: true,
      basePrice: true,
      imageUrl: true,
      features: true,
      _count: {
        select: {
          rooms: {
            where: {
              deletedAt: null,
              status: "AVAILABLE",
              floor: { deletedAt: null, building: { propertyId: property.id, deletedAt: null } },
            },
          },
        },
      },
    },
    orderBy: [{ capacity: "asc" }, { name: "asc" }],
  });

  const roomTypes = types
    .filter((t) => t._count.rooms > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      capacity: t.capacity,
      basePrice: t.basePrice === null ? null : Number(t.basePrice),
      imageUrl: isRoomPhoto(t.imageUrl) ? t.imageUrl : ROOM_PHOTO_FALLBACK,
      features: t.features,
      sellableRooms: t._count.rooms,
    }));

  return {
    currencyCode: property.baseCurrency,
    roomTypes,
    totalSellableRooms: roomTypes.reduce((sum, t) => sum + t.sellableRooms, 0),
  };
}

const cachedPublicRooms = unstable_cache(loadPublicRooms, ["public-rooms-v1"], {
  tags: [PUBLIC_ROOMS_TAG],
  revalidate: 3600,
});

/**
 * Room types for the public rooms page and home-page carousel.
 *
 * Cached and invalidated by the inventory actions. Returns `null` when the
 * database cannot be read, so a page can say so rather than claim there are
 * no rooms.
 */
export async function getPublicRooms(): Promise<PublicRooms | null> {
  try {
    return await cachedPublicRooms();
  } catch (error) {
    console.error("getPublicRooms failed:", error instanceof Error ? error.message : error);
    return null;
  }
}
