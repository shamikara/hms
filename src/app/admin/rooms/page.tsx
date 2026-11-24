import { getInventory } from "@/features/rooms/actions/inventory.actions";
import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { InventoryBoard } from "@/features/rooms/components/InventoryBoard";
import prisma from "@/core/db/prisma";
import { resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";

async function uploadedPhotos() {
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return [];
    const rows = await prisma.mediaAsset.findMany({ where: { propertyId }, orderBy: { createdAt: "desc" }, select: { url: true, alt: true } });
    return rows.map((r) => ({ src: r.url, alt: r.alt }));
  } catch {
    return [];
  }
}

export default async function RoomsPage() {
  const [result, actor, photos] = await Promise.all([getInventory(), getAdminActor(), uploadedPhotos()]);

  return (
    <InventoryBoard
      inventory={result.success && result.data ? result.data : null}
      loadError={result.success ? undefined : result.error}
      // Housekeeping staff see the list and can mark rooms made up, but the
      // rates and the inventory itself are not theirs to change.
      canManage={actor?.permissions.includes("rooms:manage") ?? false}
      uploadedPhotos={photos}
    />
  );
}
