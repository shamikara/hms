"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Wrench, Archive, RotateCcw, ExternalLink } from "lucide-react";
import {
  FuelType,
  OwnershipType,
  VehicleStatus,
  VehicleType,
} from "@prisma/client";
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
  StarDisplay,
  TableShell,
  Td,
  Th,
  VehicleStatusBadge,
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
  archiveVehicleAction,
  changeVehicleStatusAction,
  createVehicleAction,
  updateVehicleAction,
} from "../actions/vehicles.actions";
import type { VehicleRow } from "../repositories/vehicle.repository";

/**
 * Vehicle register: search, filter, create, edit, status change and archive.
 * All mutations go through the server actions, which re-authorise and validate.
 */

interface VehicleManagerProps {
  propertyId: string;
  vehicles: VehicleRow[];
  canManage: boolean;
}

/** Statuses a human is allowed to set; the rest are derived from operations. */
const MANUAL_STATUSES: VehicleStatus[] = [
  VehicleStatus.AVAILABLE,
  VehicleStatus.MAINTENANCE,
  VehicleStatus.OUT_OF_SERVICE,
];

type FormState = {
  plateNumber: string;
  displayName: string;
  make: string;
  model: string;
  vehicleType: VehicleType;
  capacity: string;
  safariCapacity: string;
  fuelType: FuelType;
  ownershipType: OwnershipType;
  purchaseYear: string;
  currentMileage: string;
  notes: string;
  imageUrl: string;
};

const emptyForm: FormState = {
  plateNumber: "",
  displayName: "",
  make: "",
  model: "",
  vehicleType: VehicleType.SAFARI_JEEP,
  capacity: "7",
  safariCapacity: "",
  fuelType: FuelType.DIESEL,
  ownershipType: OwnershipType.OWNED,
  purchaseYear: "",
  currentMileage: "0",
  notes: "",
  imageUrl: "",
};

function toForm(vehicle: VehicleRow): FormState {
  return {
    plateNumber: vehicle.plateNumber,
    displayName: vehicle.displayName ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    vehicleType: vehicle.vehicleType,
    capacity: String(vehicle.capacity),
    safariCapacity: vehicle.safariCapacity === null ? "" : String(vehicle.safariCapacity),
    fuelType: vehicle.fuelType,
    ownershipType: vehicle.ownershipType,
    purchaseYear: vehicle.purchaseYear === null ? "" : String(vehicle.purchaseYear),
    currentMileage: String(vehicle.currentMileage),
    notes: vehicle.notes ?? "",
    imageUrl: vehicle.imageUrls[0] ?? "",
  };
}

function optionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function VehicleManager({ propertyId, vehicles, canManage }: VehicleManagerProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | VehicleStatus>("ALL");
  const [showArchived, setShowArchived] = React.useState(false);

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<VehicleRow | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [error, setError] = React.useState<string | null>(null);
  const [conflicts, setConflicts] = React.useState<string[]>([]);
  const [pending, setPending] = React.useState(false);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      if (!showArchived && vehicle.deletedAt !== null) return false;
      if (statusFilter !== "ALL" && vehicle.status !== statusFilter) return false;
      if (term === "") return true;
      return [vehicle.plateNumber, vehicle.displayName, vehicle.make, vehicle.model]
        .filter((v): v is string => typeof v === "string")
        .some((v) => v.toLowerCase().includes(term));
    });
  }, [vehicles, search, statusFilter, showArchived]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setConflicts([]);
    setDialogOpen(true);
  }

  function openEdit(vehicle: VehicleRow) {
    setEditing(vehicle);
    setForm(toForm(vehicle));
    setError(null);
    setConflicts([]);
    setDialogOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setConflicts([]);

    const imageUrls = form.imageUrl.trim() === "" ? [] : [form.imageUrl.trim()];

    const result = editing
      ? await updateVehicleAction({
          id: editing.id,
          plateNumber: form.plateNumber,
          displayName: form.displayName,
          make: form.make,
          model: form.model,
          vehicleType: form.vehicleType,
          capacity: optionalNumber(form.capacity),
          safariCapacity: optionalNumber(form.safariCapacity) ?? null,
          fuelType: form.fuelType,
          ownershipType: form.ownershipType,
          purchaseYear: optionalNumber(form.purchaseYear) ?? null,
          currentMileage: optionalNumber(form.currentMileage),
          notes: form.notes,
          imageUrls,
        })
      : await createVehicleAction({
          propertyId,
          plateNumber: form.plateNumber,
          displayName: form.displayName,
          make: form.make,
          model: form.model,
          vehicleType: form.vehicleType,
          capacity: optionalNumber(form.capacity) ?? 0,
          safariCapacity: optionalNumber(form.safariCapacity),
          fuelType: form.fuelType,
          ownershipType: form.ownershipType,
          purchaseYear: optionalNumber(form.purchaseYear),
          currentMileage: optionalNumber(form.currentMileage) ?? 0,
          notes: form.notes,
          imageUrls,
        });

    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Could not save the vehicle.");
      setConflicts(result.conflicts ?? []);
      return;
    }

    setDialogOpen(false);
    router.refresh();
  }

  async function handleStatusChange(vehicle: VehicleRow, status: VehicleStatus) {
    setPending(true);
    const result = await changeVehicleStatusAction({ id: vehicle.id, status });
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? "Could not change the status.");
      return;
    }
    router.refresh();
  }

  async function handleArchive(vehicle: VehicleRow, archive: boolean) {
    const label = archive ? "Archive" : "Restore";
    if (!window.confirm(`${label} ${vehicle.plateNumber}?`)) return;
    setPending(true);
    const result = await archiveVehicleAction({ id: vehicle.id, archive });
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? `Could not ${label.toLowerCase()} the vehicle.`);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plate, name, make…"
              className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | VehicleStatus)}
            className="sm:w-48"
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <EnumOptions values={Object.values(VehicleStatus)} />
          </Select>
          <label className="inline-flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-emerald-600"
            />
            Show archived
          </label>
        </div>

        {canManage && (
          <Button variant="primary" size="lg" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add vehicle
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            vehicles.length === 0
              ? "No vehicles registered for this property yet."
              : "No vehicles match the current filters."
          }
        />
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <Th>Vehicle</Th>
              <Th>Type</Th>
              <Th>Capacity</Th>
              <Th>Status</Th>
              <Th>Odometer</Th>
              <Th>Guest rating</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((vehicle) => (
              <tr
                key={vehicle.id}
                className="border-b border-stone-100 dark:border-stone-800/70 hover:bg-stone-50/70 dark:hover:bg-stone-950/40"
              >
                <Td>
                  <Link
                    href={`/admin/safari/fleet/vehicles/${vehicle.id}`}
                    className="group inline-flex flex-col"
                  >
                    <span className="font-medium text-stone-900 dark:text-stone-100 group-hover:text-emerald-600">
                      {vehicle.displayName ?? vehicle.plateNumber}
                      <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
                    </span>
                    <span className="text-[11px] font-mono text-stone-500">
                      {vehicle.plateNumber}
                      {vehicle.make && ` • ${vehicle.make} ${vehicle.model ?? ""}`}
                    </span>
                  </Link>
                  {vehicle.deletedAt !== null && (
                    <span className="ml-2 text-[10px] font-mono uppercase text-red-600">
                      archived
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="text-xs">{humaniseEnum(vehicle.vehicleType)}</span>
                </Td>
                <Td>
                  <span className="text-xs font-mono">
                    {vehicle.safariCapacity ?? vehicle.capacity} on safari
                    <span className="text-stone-400"> / {vehicle.capacity} seats</span>
                  </span>
                </Td>
                <Td>
                  <VehicleStatusBadge status={vehicle.status} />
                </Td>
                <Td>
                  <span className="text-xs font-mono">
                    {vehicle.currentMileage.toLocaleString()} km
                  </span>
                </Td>
                <Td>
                  <StarDisplay value={Number(vehicle.ratingAvg ?? NaN)} count={vehicle.ratingCount} />
                </Td>
                <Td className="text-right whitespace-nowrap">
                  {canManage && vehicle.deletedAt === null && (
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={pending}
                        onClick={() => openEdit(vehicle)}
                      >
                        Edit
                      </Button>
                      <Select
                        value=""
                        disabled={pending}
                        aria-label={`Set status for ${vehicle.plateNumber}`}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (next) handleStatusChange(vehicle, next as VehicleStatus);
                        }}
                        className="w-32 py-1 text-xs"
                      >
                        <option value="">Set status…</option>
                        <EnumOptions values={MANUAL_STATUSES} />
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        title="Archive vehicle"
                        onClick={() => handleArchive(vehicle, true)}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                  {canManage && vehicle.deletedAt !== null && (
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={pending}
                      onClick={() => handleArchive(vehicle, false)}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Restore
                    </Button>
                  )}
                  {!canManage && (
                    <span className="text-[11px] text-stone-400">View only</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-600" />
              {editing ? `Edit ${editing.plateNumber}` : "Register a safari vehicle"}
            </DialogTitle>
            <DialogDescription>
              Capacity drives assignment: a vehicle is only offered for a safari when its
              safari capacity covers the party size.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError message={error} />
            <ConflictList conflicts={conflicts} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Registration number" required>
                <TextInput
                  value={form.plateNumber}
                  onChange={(e) => update("plateNumber", e.target.value)}
                  placeholder="UDA-7721"
                  required
                />
              </Field>
              <Field label="Display name" hint="Shown on the dispatch board">
                <TextInput
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                  placeholder="Land Cruiser #01"
                />
              </Field>
              <Field label="Make">
                <TextInput
                  value={form.make}
                  onChange={(e) => update("make", e.target.value)}
                  placeholder="Toyota"
                />
              </Field>
              <Field label="Model">
                <TextInput
                  value={form.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Land Cruiser 79"
                />
              </Field>
              <Field label="Vehicle type">
                <Select
                  value={form.vehicleType}
                  onChange={(e) => update("vehicleType", e.target.value as VehicleType)}
                >
                  <EnumOptions values={Object.values(VehicleType)} />
                </Select>
              </Field>
              <Field label="Fuel type">
                <Select
                  value={form.fuelType}
                  onChange={(e) => update("fuelType", e.target.value as FuelType)}
                >
                  <EnumOptions values={Object.values(FuelType)} />
                </Select>
              </Field>
              <Field label="Seating capacity" required>
                <TextInput
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => update("capacity", e.target.value)}
                  required
                />
              </Field>
              <Field
                label="Safari capacity"
                hint="Leave blank to use the seating capacity"
              >
                <TextInput
                  type="number"
                  min={1}
                  value={form.safariCapacity}
                  onChange={(e) => update("safariCapacity", e.target.value)}
                />
              </Field>
              <Field label="Ownership">
                <Select
                  value={form.ownershipType}
                  onChange={(e) => update("ownershipType", e.target.value as OwnershipType)}
                >
                  <EnumOptions values={Object.values(OwnershipType)} />
                </Select>
              </Field>
              <Field label="Purchase year">
                <TextInput
                  type="number"
                  min={1950}
                  value={form.purchaseYear}
                  onChange={(e) => update("purchaseYear", e.target.value)}
                />
              </Field>
              <Field label="Current odometer (km)">
                <TextInput
                  type="number"
                  min={0}
                  value={form.currentMileage}
                  onChange={(e) => update("currentMileage", e.target.value)}
                />
              </Field>
              <Field label="Image URL" hint="External URL; no file storage is configured">
                <TextInput
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => update("imageUrl", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>

            <Field label="Notes">
              <TextArea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Roof hatch replaced, spare tyre due…"
              />
            </Field>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={pending}>
                {pending ? "Saving…" : editing ? "Save changes" : "Register vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
