import {
  listDriverCandidatesAction,
  listDriversAction,
} from "@/features/fleet/actions/drivers.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { DriverManager } from "@/features/fleet/components/DriverManager";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import { SectionCard } from "@/features/fleet/components/FleetPrimitives";

export const dynamic = "force-dynamic";

export default async function FleetDriversPage() {
  const [driversResult, permissionsResult] = await Promise.all([
    listDriversAction({ includeArchived: true }),
    getMyFleetPermissionsAction(),
  ]);

  if (!driversResult.success || !driversResult.data) {
    return (
      <FleetUnavailable message={driversResult.error ?? "Drivers could not be loaded."} />
    );
  }

  const canManage =
    permissionsResult.success === true &&
    permissionsResult.data?.permissions.includes("fleet:manage") === true;

  // Only fetched when the user can actually register a driver.
  const candidatesResult = canManage ? await listDriverCandidatesAction() : null;
  const candidates =
    candidatesResult?.success === true && candidatesResult.data
      ? candidatesResult.data.candidates
      : [];

  return (
    <SectionCard
      title="Driver register"
      subtitle="Safari driving credentials layered on the existing staff directory — no duplicate people records."
    >
      <DriverManager
        drivers={driversResult.data.drivers}
        candidates={candidates}
        canManage={canManage}
      />
    </SectionCard>
  );
}
