import { getInventory } from "@/features/rooms/actions/inventory.actions";
import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { InventoryBoard } from "@/features/rooms/components/InventoryBoard";

export default async function RoomsPage() {
  const [result, actor] = await Promise.all([getInventory(), getAdminActor()]);

  return (
    <InventoryBoard
      inventory={result.success && result.data ? result.data : null}
      loadError={result.success ? undefined : result.error}
      // Housekeeping staff see the list and can mark rooms made up, but the
      // rates and the inventory itself are not theirs to change.
      canManage={actor?.permissions.includes("rooms:manage") ?? false}
    />
  );
}
