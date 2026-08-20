import { listMaintenanceAction } from "@/features/fleet/actions/ops.actions";
import { listVehiclesAction } from "@/features/fleet/actions/vehicles.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { getPropertyContext } from "@/features/fleet/lib/property";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import { MaintenanceManager } from "@/features/fleet/components/MaintenanceManager";

export const dynamic = "force-dynamic";

export default async function FleetMaintenancePage() {
  const [maintenanceResult, vehiclesResult, permissionsResult] = await Promise.all([
    listMaintenanceAction(),
    listVehiclesAction(),
    getMyFleetPermissionsAction(),
  ]);

  if (!maintenanceResult.success || !maintenanceResult.data) {
    return (
      <FleetUnavailable
        message={maintenanceResult.error ?? "Maintenance records could not be loaded."}
      />
    );
  }

  const property = await getPropertyContext(maintenanceResult.data.propertyId);
  const canManage =
    permissionsResult.success === true &&
    permissionsResult.data?.permissions.includes("fleet:manage") === true;

  const vehicles =
    vehiclesResult.success && vehiclesResult.data
      ? vehiclesResult.data.vehicles
          .filter((vehicle) => vehicle.deletedAt === null)
          .map((vehicle) => ({
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            displayName: vehicle.displayName,
            currentMileage: vehicle.currentMileage,
          }))
      : [];

  return (
    <MaintenanceManager
      records={maintenanceResult.data.records}
      vehicles={vehicles}
      currencyCode={property?.baseCurrency ?? "USD"}
      canManage={canManage}
    />
  );
}
