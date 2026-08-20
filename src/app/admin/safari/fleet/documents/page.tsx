import { listVehicleDocumentsAction } from "@/features/fleet/actions/ops.actions";
import { listVehiclesAction } from "@/features/fleet/actions/vehicles.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { DocumentManager } from "@/features/fleet/components/DocumentManager";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";

export const dynamic = "force-dynamic";

export default async function FleetDocumentsPage() {
  const [documentsResult, vehiclesResult, permissionsResult] = await Promise.all([
    listVehicleDocumentsAction(),
    listVehiclesAction(),
    getMyFleetPermissionsAction(),
  ]);

  if (!documentsResult.success || !documentsResult.data) {
    return (
      <FleetUnavailable
        message={documentsResult.error ?? "Vehicle documents could not be loaded."}
      />
    );
  }

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
          }))
      : [];

  return (
    <DocumentManager
      documents={documentsResult.data.documents}
      vehicles={vehicles}
      canManage={canManage}
    />
  );
}
