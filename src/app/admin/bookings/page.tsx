import { getDeskReservations } from "@/features/admin/actions/reservations.actions";
import { getAdminActor, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { BookingsBoard } from "@/features/admin/components/BookingsBoard";

export default async function BookingsPage() {
  const [result, propertyId, actor] = await Promise.all([
    getDeskReservations(),
    resolveDefaultPropertyId(),
    getAdminActor(),
  ]);

  // An empty table is the honest rendering of "no bookings yet"; the error is
  // shown alongside it rather than replaced by sample rows.
  return (
    <BookingsBoard
      reservations={result.success && result.data ? result.data : []}
      propertyId={propertyId}
      loadError={result.success ? undefined : result.error}
      canDelete={actor?.permissions.includes("reservations:delete") ?? false}
    />
  );
}
