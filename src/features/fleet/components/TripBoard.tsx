"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Play,
  Flag,
  Ban,
  CalendarClock,
  Users,
  Gauge,
  AlertTriangle,
  Send,
} from "lucide-react";
import { SafariTripStatus, SafariTripType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  SectionCard,
  TableShell,
  Td,
  Th,
  TripStatusBadge,
  humaniseEnum,
} from "./FleetPrimitives";
import {
  ConflictList,
  EnumOptions,
  Field,
  FormError,
  Select,
  TextArea,
  TextInput,
} from "./FleetFormControls";
import {
  cancelTripAction,
  completeTripAction,
  createTripAction,
  dispatchScheduleAction,
  getAvailabilityAction,
  startTripAction,
} from "../actions/trips.actions";
import type { TripRow } from "../repositories/trip.repository";
import type {
  DriverAvailability,
  VehicleAvailability,
} from "../services/availability.service";

/**
 * Dispatch board.
 *
 * The assignment flow follows the sequence in the brief: pick the window and
 * party size first, then the screen only offers vehicles and drivers that are
 * genuinely free — with the reason shown against the ones that are not.
 */

interface GuideOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface DispatchableSchedule {
  id: string;
  startTime: Date;
  endTime: Date;
  totalGuests: number;
  vehicle: { id: string; plateNumber: string; displayName: string | null };
  route: { id: string; name: string };
  guide: { id: string; firstName: string; lastName: string };
  driver: { id: string; firstName: string; lastName: string };
}

interface DriverOption {
  id: string;
  name: string;
  licenseNumber: string;
}

interface TripBoardProps {
  propertyId: string;
  trips: TripRow[];
  guides: GuideOption[];
  /** All rostered drivers, used by the schedule-dispatch picker. */
  drivers: DriverOption[];
  schedules: DispatchableSchedule[];
  canDispatch: boolean;
  defaultDestination: string;
}

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function driverLabel(availability: DriverAvailability): string {
  const d = availability.driver;
  return `${d.employee.firstName} ${d.employee.lastName} · ${d.licenseNumber}`;
}

function vehicleLabel(availability: VehicleAvailability): string {
  const v = availability.vehicle;
  const name = v.displayName ? `${v.displayName} (${v.plateNumber})` : v.plateNumber;
  return `${name} · seats ${availability.effectiveCapacity}`;
}

export function TripBoard({
  propertyId,
  trips,
  guides,
  drivers,
  schedules,
  canDispatch,
  defaultDestination,
}: TripBoardProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | SafariTripStatus>("ALL");
  const [pending, setPending] = React.useState(false);

  // --- assignment dialog state
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [destination, setDestination] = React.useState(defaultDestination);
  const [tripType, setTripType] = React.useState<SafariTripType>(
    SafariTripType.MORNING_GAME_DRIVE
  );
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [guestCount, setGuestCount] = React.useState("2");
  const [vehicleId, setVehicleId] = React.useState("");
  const [driverId, setDriverId] = React.useState("");
  const [guideId, setGuideId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [availability, setAvailability] = React.useState<{
    vehicles: VehicleAvailability[];
    drivers: DriverAvailability[];
  } | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [conflicts, setConflicts] = React.useState<string[]>([]);

  // --- lifecycle dialog state
  const [lifecycleTrip, setLifecycleTrip] = React.useState<TripRow | null>(null);
  const [lifecycleMode, setLifecycleMode] = React.useState<
    "START" | "COMPLETE" | "CANCEL" | null
  >(null);
  const [odometer, setOdometer] = React.useState("");
  const [fuelLevel, setFuelLevel] = React.useState("");
  const [lifecycleNotes, setLifecycleNotes] = React.useState("");
  const [incidentNotes, setIncidentNotes] = React.useState("");
  const [sendToMaintenance, setSendToMaintenance] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  // --- dispatch-from-schedule state
  const [scheduleId, setScheduleId] = React.useState("");
  const [scheduleDriverId, setScheduleDriverId] = React.useState("");

  const filtered = React.useMemo(
    () => trips.filter((trip) => statusFilter === "ALL" || trip.status === statusFilter),
    [trips, statusFilter]
  );

  const availableVehicles = availability?.vehicles.filter((v) => v.isAvailable) ?? [];
  const blockedVehicles = availability?.vehicles.filter((v) => !v.isAvailable) ?? [];
  const availableDrivers = availability?.drivers.filter((d) => d.isAvailable) ?? [];
  const blockedDrivers = availability?.drivers.filter((d) => !d.isAvailable) ?? [];

  function openAssign() {
    const now = new Date();
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000);
    const defaultEnd = new Date(defaultStart.getTime() + 4 * 60 * 60 * 1000);
    setDestination(defaultDestination);
    setTripType(SafariTripType.MORNING_GAME_DRIVE);
    setStart(toLocalInput(defaultStart));
    setEnd(toLocalInput(defaultEnd));
    setGuestCount("2");
    setVehicleId("");
    setDriverId("");
    setGuideId("");
    setNotes("");
    setAvailability(null);
    setError(null);
    setConflicts([]);
    setAssignOpen(true);
  }

  /** Step 3/5 of the flow: only show what is actually free for this window. */
  async function loadAvailability() {
    setError(null);
    setConflicts([]);
    if (!start || !end) {
      setError("Enter a departure and return time first.");
      return;
    }
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (endDate <= startDate) {
      setError("Return time must be after departure time.");
      return;
    }

    setAvailabilityLoading(true);
    const result = await getAvailabilityAction({
      propertyId,
      start: startDate,
      end: endDate,
      guestCount: Number(guestCount) || 1,
    });
    setAvailabilityLoading(false);

    if (!result.success || !result.data) {
      setError(result.error ?? "Could not load availability.");
      setAvailability(null);
      return;
    }

    setAvailability({ vehicles: result.data.vehicles, drivers: result.data.drivers });
    setVehicleId("");
    setDriverId("");
  }

  async function handleAssign(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setConflicts([]);

    if (!vehicleId || !driverId) {
      setError("Select an available vehicle and driver.");
      return;
    }

    setPending(true);
    const result = await createTripAction({
      propertyId,
      vehicleId,
      driverId,
      guideId: guideId || undefined,
      destination,
      tripType,
      scheduledStart: new Date(start),
      scheduledEnd: new Date(end),
      guestCount: Number(guestCount) || 1,
      status: SafariTripStatus.CONFIRMED,
      operationalNotes: notes,
    });
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Could not create the assignment.");
      setConflicts(result.conflicts ?? []);
      return;
    }

    setAssignOpen(false);
    router.refresh();
  }

  function openLifecycle(trip: TripRow, mode: "START" | "COMPLETE" | "CANCEL") {
    setLifecycleTrip(trip);
    setLifecycleMode(mode);
    setError(null);
    setConflicts([]);
    setOdometer(
      mode === "START"
        ? String(trip.vehicle.currentMileage)
        : String(trip.startMileage ?? trip.vehicle.currentMileage)
    );
    setFuelLevel("");
    setLifecycleNotes("");
    setIncidentNotes("");
    setSendToMaintenance(false);
    setCancelReason("");
  }

  async function handleLifecycle(event: React.FormEvent) {
    event.preventDefault();
    if (!lifecycleTrip || !lifecycleMode) return;
    setPending(true);
    setError(null);

    const mileage = Number(odometer);
    const fuel = fuelLevel.trim() === "" ? undefined : Number(fuelLevel);

    const result =
      lifecycleMode === "START"
        ? await startTripAction({
            id: lifecycleTrip.id,
            startMileage: mileage,
            startFuelLevel: fuel,
            operationalNotes: lifecycleNotes,
          })
        : lifecycleMode === "COMPLETE"
          ? await completeTripAction({
              id: lifecycleTrip.id,
              endMileage: mileage,
              endFuelLevel: fuel,
              operationalNotes: lifecycleNotes,
              incidentNotes,
              sendToMaintenance,
            })
          : await cancelTripAction({ id: lifecycleTrip.id, reason: cancelReason });

    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Could not update the trip.");
      return;
    }

    setLifecycleMode(null);
    setLifecycleTrip(null);
    router.refresh();
  }

  async function handleDispatchSchedule(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!scheduleId || !scheduleDriverId) {
      setError("Choose a game drive and a driver.");
      return;
    }
    setPending(true);
    const result = await dispatchScheduleAction({
      scheduleId,
      driverId: scheduleDriverId,
    });
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not dispatch the game drive.");
      setConflicts(result.conflicts ?? []);
      return;
    }
    setScheduleId("");
    setScheduleDriverId("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Dispatch existing game drives (bridge to the original booking flow) */}
      {canDispatch && schedules.length > 0 && (
        <SectionCard
          title="Awaiting dispatch"
          subtitle="Booked game drives from the reservation flow that do not have an operational trip yet."
        >
          <form
            onSubmit={handleDispatchSchedule}
            className="flex flex-col lg:flex-row gap-3 lg:items-end"
          >
            <div className="flex-1">
              <Field label="Game drive">
                <Select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
                  <option value="">Select a booked game drive…</option>
                  {schedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.route.name} · {format(new Date(schedule.startTime), "d MMM HH:mm")} ·{" "}
                      {schedule.vehicle.displayName ?? schedule.vehicle.plateNumber} ·{" "}
                      {schedule.totalGuests} guests
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Assign driver">
                <Select
                  value={scheduleDriverId}
                  onChange={(e) => setScheduleDriverId(e.target.value)}
                >
                  <option value="">Select a driver…</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} · {driver.licenseNumber}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-[11px] text-stone-400 mt-1">
                Conflicts are re-checked on the server; an unavailable driver is refused
                with the reason.
              </p>
            </div>
            <Button type="submit" variant="primary" size="lg" disabled={pending}>
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Dispatch
            </Button>
          </form>
        </SectionCard>
      )}

      <SectionCard
        title="Safari trips"
        subtitle="Operational record of every assignment, departure and return."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | SafariTripStatus)}
              className="w-40 py-1.5 text-xs"
              aria-label="Filter trips by status"
            >
              <option value="ALL">All statuses</option>
              <EnumOptions values={Object.values(SafariTripStatus)} />
            </Select>
            {canDispatch && (
              <Button variant="primary" size="lg" onClick={openAssign}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                New assignment
              </Button>
            )}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState
            message={
              trips.length === 0
                ? "No safari trips recorded yet. Create an assignment to start the operational log."
                : "No trips match this status filter."
            }
          />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <Th>Safari</Th>
                <Th>Window</Th>
                <Th>Vehicle</Th>
                <Th>Driver</Th>
                <Th>Guests</Th>
                <Th>Distance</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((trip) => (
                <tr
                  key={trip.id}
                  className="border-b border-stone-100 dark:border-stone-800/70 hover:bg-stone-50/70 dark:hover:bg-stone-950/40"
                >
                  <Td>
                    <div className="flex flex-col">
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {trip.destination}
                      </span>
                      <span className="text-[11px] text-stone-500">
                        {humaniseEnum(trip.tripType)}
                        {trip.route && ` • ${trip.route.name}`}
                        {trip.scheduleId && " • from booking"}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col text-[11px] font-mono text-stone-600 dark:text-stone-400">
                      <span>{format(new Date(trip.scheduledStart), "d MMM HH:mm")}</span>
                      <span className="text-stone-400">
                        → {format(new Date(trip.scheduledEnd), "d MMM HH:mm")}
                      </span>
                      {trip.actualDeparture && (
                        <span className="text-emerald-600">
                          left {format(new Date(trip.actualDeparture), "HH:mm")}
                          {trip.actualReturn &&
                            ` · back ${format(new Date(trip.actualReturn), "HH:mm")}`}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs">
                      {trip.vehicle.displayName ?? trip.vehicle.plateNumber}
                      <span className="block text-[11px] font-mono text-stone-400">
                        {trip.vehicle.plateNumber}
                      </span>
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs">
                      {trip.driver.employee.firstName} {trip.driver.employee.lastName}
                      {trip.guide && (
                        <span className="block text-[11px] text-stone-400">
                          Guide: {trip.guide.firstName} {trip.guide.lastName}
                        </span>
                      )}
                    </span>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1 text-xs font-mono">
                      <Users className="w-3 h-3 text-stone-400" />
                      {trip.guestCount}
                    </span>
                  </Td>
                  <Td>
                    {trip.distanceKm !== null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono">
                        <Gauge className="w-3 h-3 text-stone-400" />
                        {trip.distanceKm} km
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <TripStatusBadge status={trip.status} />
                      {trip.review && (
                        <Badge variant="blue">Reviewed {trip.review.overallRating}★</Badge>
                      )}
                      {trip.incidentNotes && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-amber-600"
                          title={trip.incidentNotes}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Incident logged
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {canDispatch ? (
                      <div className="inline-flex items-center gap-1">
                        {(trip.status === SafariTripStatus.SCHEDULED ||
                          trip.status === SafariTripStatus.CONFIRMED) && (
                          <>
                            <Button
                              variant="primary"
                              size="xs"
                              disabled={pending}
                              onClick={() => openLifecycle(trip, "START")}
                            >
                              <Play className="w-3 h-3 mr-1" />
                              Start
                            </Button>
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={pending}
                              onClick={() => openLifecycle(trip, "CANCEL")}
                            >
                              <Ban className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {trip.status === SafariTripStatus.IN_PROGRESS && (
                          <Button
                            variant="primary"
                            size="xs"
                            disabled={pending}
                            onClick={() => openLifecycle(trip, "COMPLETE")}
                          >
                            <Flag className="w-3 h-3 mr-1" />
                            Complete
                          </Button>
                        )}
                        {trip.status === SafariTripStatus.COMPLETED && (
                          <span className="text-[11px] text-stone-400">
                            {trip.review ? "Reviewed" : "Awaiting guest review"}
                          </span>
                        )}
                        {trip.status === SafariTripStatus.CANCELLED && (
                          <span className="text-[11px] text-stone-400">Cancelled</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-400">View only</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      {/* Assignment dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-emerald-600" />
              New safari assignment
            </DialogTitle>
            <DialogDescription>
              Set the window and party size, then load availability. Only vehicles and
              drivers that are genuinely free for that window can be selected.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssign} className="space-y-4">
            <FormError message={error} />
            <ConflictList conflicts={conflicts} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Destination / park" required>
                <TextInput
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
              </Field>
              <Field label="Safari type">
                <Select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value as SafariTripType)}
                >
                  <EnumOptions values={Object.values(SafariTripType)} />
                </Select>
              </Field>
              <Field label="Departure" required>
                <TextInput
                  type="datetime-local"
                  value={start}
                  onChange={(e) => {
                    setStart(e.target.value);
                    setAvailability(null);
                  }}
                  required
                />
              </Field>
              <Field label="Expected return" required>
                <TextInput
                  type="datetime-local"
                  value={end}
                  onChange={(e) => {
                    setEnd(e.target.value);
                    setAvailability(null);
                  }}
                  required
                />
              </Field>
              <Field label="Guests" required>
                <TextInput
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={(e) => {
                    setGuestCount(e.target.value);
                    setAvailability(null);
                  }}
                  required
                />
              </Field>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={loadAvailability}
                  disabled={availabilityLoading}
                  className="w-full"
                >
                  {availabilityLoading ? "Checking…" : "Check availability"}
                </Button>
              </div>
            </div>

            {availability && (
              <div className="space-y-3 rounded-xl border border-stone-200 dark:border-stone-800 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label={`Vehicle (${availableVehicles.length} available)`}
                    required
                  >
                    <Select
                      value={vehicleId}
                      onChange={(e) => setVehicleId(e.target.value)}
                      required
                    >
                      <option value="">Select a vehicle…</option>
                      {availableVehicles.map((entry) => (
                        <option key={entry.vehicle.id} value={entry.vehicle.id}>
                          {vehicleLabel(entry)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={`Driver (${availableDrivers.length} available)`} required>
                    <Select
                      value={driverId}
                      onChange={(e) => setDriverId(e.target.value)}
                      required
                    >
                      <option value="">Select a driver…</option>
                      {availableDrivers.map((entry) => (
                        <option key={entry.driver.id} value={entry.driver.id}>
                          {driverLabel(entry)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Guide (optional)">
                    <Select value={guideId} onChange={(e) => setGuideId(e.target.value)}>
                      <option value="">No separate guide</option>
                      {guides.map((guide) => (
                        <option key={guide.id} value={guide.id}>
                          {guide.firstName} {guide.lastName}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {(blockedVehicles.length > 0 || blockedDrivers.length > 0) && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-stone-500 dark:text-stone-400">
                      Why {blockedVehicles.length} vehicle(s) and {blockedDrivers.length}{" "}
                      driver(s) are unavailable
                    </summary>
                    <ul className="mt-2 space-y-1.5 pl-1">
                      {blockedVehicles.map((entry) => (
                        <li key={entry.vehicle.id} className="text-stone-500">
                          <span className="font-mono">{entry.vehicle.plateNumber}</span>:{" "}
                          {entry.blockers.join("; ")}
                        </li>
                      ))}
                      {blockedDrivers.map((entry) => (
                        <li key={entry.driver.id} className="text-stone-500">
                          <span className="font-medium">
                            {entry.driver.employee.firstName} {entry.driver.employee.lastName}
                          </span>
                          : {entry.blockers.join("; ")}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <Field label="Operational notes">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setAssignOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={pending || !availability}
              >
                {pending ? "Assigning…" : "Confirm assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lifecycle dialog */}
      <Dialog
        open={lifecycleMode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLifecycleMode(null);
            setLifecycleTrip(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {lifecycleMode === "START"
                ? "Record departure"
                : lifecycleMode === "COMPLETE"
                  ? "Record return"
                  : "Cancel trip"}
            </DialogTitle>
            <DialogDescription>
              {lifecycleTrip
                ? `${lifecycleTrip.destination} · ${lifecycleTrip.vehicle.plateNumber}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLifecycle} className="space-y-4">
            <FormError message={error} />

            {lifecycleMode !== "CANCEL" && (
              <>
                <Field
                  label={
                    lifecycleMode === "START"
                      ? "Departure odometer (km)"
                      : "Return odometer (km)"
                  }
                  required
                  hint={
                    lifecycleMode === "COMPLETE" && lifecycleTrip?.startMileage !== null
                      ? `Departure reading was ${lifecycleTrip?.startMileage} km; distance is derived from the difference.`
                      : undefined
                  }
                >
                  <TextInput
                    type="number"
                    min={0}
                    value={odometer}
                    onChange={(e) => setOdometer(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Fuel level (%)" hint="Optional — leave blank if not recorded">
                  <TextInput
                    type="number"
                    min={0}
                    max={100}
                    value={fuelLevel}
                    onChange={(e) => setFuelLevel(e.target.value)}
                  />
                </Field>
                <Field label="Operational notes">
                  <TextArea
                    value={lifecycleNotes}
                    onChange={(e) => setLifecycleNotes(e.target.value)}
                  />
                </Field>
              </>
            )}

            {lifecycleMode === "COMPLETE" && (
              <>
                <Field label="Incidents / issues">
                  <TextArea
                    value={incidentNotes}
                    onChange={(e) => setIncidentNotes(e.target.value)}
                    placeholder="Punctured tyre replaced en route…"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={sendToMaintenance}
                    onChange={(e) => setSendToMaintenance(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Send the vehicle to maintenance instead of back into service
                </label>
              </>
            )}

            {lifecycleMode === "CANCEL" && (
              <Field label="Cancellation reason" required>
                <TextArea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                />
              </Field>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  setLifecycleMode(null);
                  setLifecycleTrip(null);
                }}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant={lifecycleMode === "CANCEL" ? "destructive" : "primary"}
                size="lg"
                disabled={pending}
              >
                {pending
                  ? "Saving…"
                  : lifecycleMode === "START"
                    ? "Mark departed"
                    : lifecycleMode === "COMPLETE"
                      ? "Mark completed"
                      : "Cancel trip"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
