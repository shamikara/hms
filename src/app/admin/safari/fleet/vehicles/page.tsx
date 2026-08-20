import { listVehiclesAction } from "@/features/fleet/actions/vehicles.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import { SectionCard } from "@/features/fleet/components/FleetPrimitives";
import { VehicleManager } from "@/features/fleet/components/VehicleManager";

export const dynamic = "force-dynamic";

export default async function FleetVehiclesPage() {
  const [vehiclesResult, permissionsResult] = await Promise.all([
    listVehiclesAction({ includeArchived: true }),
    getMyFleetPermissionsAction(),
  ]);

  if (!vehiclesResult.success || !vehiclesResult.data) {
    return (
      <FleetUnavailable message={vehiclesResult.error ?? "Vehicles could not be loaded."} />
    );
  }

  const canManage =
    permissionsResult.success === true &&
    permissionsResult.data?.permissions.includes("fleet:manage") === true;

  return (
    <SectionCard
      title="Vehicle register"
      subtitle="Safari fleet inventory. Operational status is derived from live trips and workshop jobs, not typed in."
    >
      <VehicleManager
        propertyId={vehiclesResult.data.propertyId}
        vehicles={vehiclesResult.data.vehicles}
        canManage={canManage}
      />
    </SectionCard>
  );
}
