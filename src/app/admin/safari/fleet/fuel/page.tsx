import { listFuelLogsAction } from "@/features/fleet/actions/ops.actions";
import { listVehiclesAction } from "@/features/fleet/actions/vehicles.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { getPropertyContext } from "@/features/fleet/lib/property";
import { FuelService } from "@/features/fleet/services/ops.service";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import {
  FuelManager,
  type VehicleEfficiencySummary,
} from "@/features/fleet/components/FuelManager";

export const dynamic = "force-dynamic";

export default async function FleetFuelPage() {
  const [fuelResult, vehiclesResult, permissionsResult] = await Promise.all([
    listFuelLogsAction(),
    listVehiclesAction(),
    getMyFleetPermissionsAction(),
  ]);

  if (!fuelResult.success || !fuelResult.data) {
    return (
      <FleetUnavailable message={fuelResult.error ?? "Fuel records could not be loaded."} />
    );
  }

  if (!vehiclesResult.success || !vehiclesResult.data) {
    return (
      <FleetUnavailable message={vehiclesResult.error ?? "Vehicles could not be loaded."} />
    );
  }

  const property = await getPropertyContext(fuelResult.data.propertyId);
  const permissions = permissionsResult.success
    ? permissionsResult.data?.permissions ?? []
    : [];

  const activeVehicles = vehiclesResult.data.vehicles.filter(
    (vehicle) => vehicle.deletedAt === null
  );

  // Efficiency is computed per vehicle on the server; each result carries its own
  // "not enough data" reason so the UI never shows an invented figure.
  const efficiencies: VehicleEfficiencySummary[] = await Promise.all(
    activeVehicles.map(async (vehicle) => ({
      vehicleId: vehicle.id,
      label: vehicle.displayName ?? vehicle.plateNumber,
      efficiency: await FuelService.efficiencyForVehicle(vehicle.id),
    }))
  );

  return (
    <FuelManager
      logs={fuelResult.data.logs}
      vehicles={activeVehicles.map((vehicle) => ({
        id: vehicle.id,
        plateNumber: vehicle.plateNumber,
        displayName: vehicle.displayName,
        currentMileage: vehicle.currentMileage,
      }))}
      currencyCode={property?.baseCurrency ?? "USD"}
      canManage={permissions.includes("fleet:manage")}
      efficiencies={efficiencies}
    />
  );
}
