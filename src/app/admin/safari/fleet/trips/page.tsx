import {
  listDispatchableSchedulesAction,
  listTripsAction,
} from "@/features/fleet/actions/trips.actions";
import {
  listDriverCandidatesAction,
  listDriversAction,
} from "@/features/fleet/actions/drivers.actions";
import { getMyFleetPermissionsAction } from "@/features/fleet/actions/reviews.actions";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import { TripBoard } from "@/features/fleet/components/TripBoard";

export const dynamic = "force-dynamic";

export default async function FleetTripsPage() {
  const [tripsResult, permissionsResult, driversResult] = await Promise.all([
    listTripsAction({ take: 100 }),
    getMyFleetPermissionsAction(),
    listDriversAction(),
  ]);

  if (!tripsResult.success || !tripsResult.data) {
    return <FleetUnavailable message={tripsResult.error ?? "Trips could not be loaded."} />;
  }

  const permissions = permissionsResult.success
    ? permissionsResult.data?.permissions ?? []
    : [];
  const canDispatch = permissions.includes("fleet:dispatch");
  const canManage = permissions.includes("fleet:manage");

  // Guide and schedule lookups are only needed by someone who can dispatch.
  const [candidatesResult, schedulesResult] = await Promise.all([
    canManage ? listDriverCandidatesAction() : Promise.resolve(null),
    canDispatch ? listDispatchableSchedulesAction() : Promise.resolve(null),
  ]);

  const guides =
    candidatesResult?.success === true && candidatesResult.data
      ? candidatesResult.data.guides
      : [];

  const schedules =
    schedulesResult?.success === true && schedulesResult.data
      ? schedulesResult.data.schedules
      : [];

  const drivers =
    driversResult.success && driversResult.data
      ? driversResult.data.drivers
          .filter((driver) => driver.deletedAt === null && driver.isActive)
          .map((driver) => ({
            id: driver.id,
            name: `${driver.employee.firstName} ${driver.employee.lastName}`,
            licenseNumber: driver.licenseNumber,
          }))
      : [];

  return (
    <TripBoard
      propertyId={tripsResult.data.propertyId}
      trips={tripsResult.data.trips}
      guides={guides}
      drivers={drivers}
      schedules={schedules}
      canDispatch={canDispatch}
      defaultDestination="Udawalawe National Park"
    />
  );
}
