"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Fuel } from "lucide-react";
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
  DataNotice,
  EmptyState,
  SectionCard,
  TableShell,
  Td,
  Th,
} from "./FleetPrimitives";
import { Field, FormError, Select, TextArea, TextInput } from "./FleetFormControls";
import { createFuelLogAction } from "../actions/ops.actions";
import type { FuelLogRow } from "../repositories/ops.repository";
import type { FuelEfficiencyResult } from "../lib/fuel";

/**
 * Fuel ledger plus derived efficiency.
 *
 * Efficiency is only shown when there are enough valid records; otherwise the
 * reason is displayed instead of a fabricated number.
 */

interface VehicleOption {
  id: string;
  plateNumber: string;
  displayName: string | null;
  currentMileage: number;
}

export interface VehicleEfficiencySummary {
  vehicleId: string;
  label: string;
  efficiency: FuelEfficiencyResult;
}

interface FuelManagerProps {
  logs: FuelLogRow[];
  vehicles: VehicleOption[];
  currencyCode: string;
  canManage: boolean;
  /** Per-vehicle efficiency, computed on the server. */
  efficiencies: VehicleEfficiencySummary[];
  lockedVehicleId?: string;
}

export function FuelManager({
  logs,
  vehicles,
  currencyCode,
  canManage,
  efficiencies,
  lockedVehicleId,
}: FuelManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [vehicleId, setVehicleId] = React.useState(lockedVehicleId ?? "");
  const [loggedAt, setLoggedAt] = React.useState("");
  const [mileage, setMileage] = React.useState("");
  const [litres, setLitres] = React.useState("");
  const [totalCost, setTotalCost] = React.useState("");
  const [station, setStation] = React.useState("");
  const [receiptRef, setReceiptRef] = React.useState("");
  const [notes, setNotes] = React.useState("");

  function openCreate() {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    setVehicleId(lockedVehicleId ?? "");
    setLoggedAt(
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
    );
    setMileage("");
    setLitres("");
    setTotalCost("");
    setStation("");
    setReceiptRef("");
    setNotes("");
    setError(null);
    setDialogOpen(true);
  }

  function handleVehicleChange(nextId: string) {
    setVehicleId(nextId);
    const vehicle = vehicles.find((v) => v.id === nextId);
    if (vehicle && mileage.trim() === "") setMileage(String(vehicle.currentMileage));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createFuelLogAction({
      vehicleId,
      loggedAt,
      mileage: Number(mileage),
      litres: Number(litres),
      totalCost: Number(totalCost),
      currencyCode,
      station,
      receiptRef,
      notes,
    });

    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not save the fuel record.");
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  const measurable = efficiencies.filter((e) => e.efficiency.kmPerLitre !== null);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Fuel efficiency"
        subtitle="Tank-to-tank calculation from odometer readings. The first fill-up of each window is excluded, because its fuel was burned before the window started."
      >
        {efficiencies.length === 0 ? (
          <EmptyState message="No vehicles to analyse yet." />
        ) : measurable.length === 0 ? (
          <div className="space-y-2">
            <EmptyState message="Not enough fuel records to calculate efficiency for any vehicle yet." />
            <ul className="space-y-1">
              {efficiencies.slice(0, 6).map((entry) => (
                <li key={entry.vehicleId}>
                  <DataNotice
                    message={`${entry.label}: ${entry.efficiency.insufficientDataReason || "no fuel records"}`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <Th>Vehicle</Th>
                <Th>km / litre</Th>
                <Th>Fuel cost / km</Th>
                <Th>Distance measured</Th>
                <Th>Litres counted</Th>
                <Th>Records</Th>
              </tr>
            </thead>
            <tbody>
              {efficiencies.map((entry) => (
                <tr
                  key={entry.vehicleId}
                  className="border-b border-stone-100 dark:border-stone-800/70"
                >
                  <Td>
                    <span className="text-xs font-medium">{entry.label}</span>
                  </Td>
                  <Td>
                    {entry.efficiency.kmPerLitre !== null ? (
                      <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400">
                        {entry.efficiency.kmPerLitre.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400">
                        {entry.efficiency.insufficientDataReason || "No data"}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {entry.efficiency.fuelCostPerKm !== null
                        ? `${currencyCode} ${entry.efficiency.fuelCostPerKm.toFixed(3)}`
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {entry.efficiency.distanceKm !== null
                        ? `${entry.efficiency.distanceKm.toLocaleString()} km`
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {entry.efficiency.litresCounted !== null
                        ? `${entry.efficiency.litresCounted.toFixed(2)} L`
                        : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono text-stone-500">
                      {entry.efficiency.sampleSize}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <SectionCard
        title="Fuel log"
        subtitle="Every fill-up, with the odometer reading that makes efficiency calculable."
        action={
          canManage && (
            <Button variant="primary" size="lg" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Log fill-up
            </Button>
          )
        }
      >
        {logs.length === 0 ? (
          <EmptyState message="No fuel records yet." />
        ) : (
          <TableShell>
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800">
                <Th>Date</Th>
                <Th>Vehicle</Th>
                <Th>Odometer</Th>
                <Th>Litres</Th>
                <Th>Cost</Th>
                <Th>Per litre</Th>
                <Th>Station</Th>
                <Th>Recorded by</Th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const litreCount = Number(log.litres);
                const cost = Number(log.totalCost);
                return (
                  <tr
                    key={log.id}
                    className="border-b border-stone-100 dark:border-stone-800/70"
                  >
                    <Td>
                      <span className="text-xs font-mono">
                        {format(new Date(log.loggedAt), "d MMM yyyy HH:mm")}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">{log.vehicle.plateNumber}</span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">
                        {log.mileage.toLocaleString()} km
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">{litreCount.toFixed(2)} L</span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono">
                        {log.currencyCode} {cost.toFixed(2)}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-mono text-stone-500">
                        {litreCount > 0 ? (cost / litreCount).toFixed(2) : "—"}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs">{log.station ?? "—"}</span>
                      {log.receiptRef && (
                        <span className="block text-[11px] text-stone-400 font-mono">
                          {log.receiptRef}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="text-[11px] text-stone-500">
                        {log.recordedBy
                          ? `${log.recordedBy.firstName} ${log.recordedBy.lastName}`
                          : "—"}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-600" />
              Log a fill-up
            </DialogTitle>
            <DialogDescription>
              The odometer reading must not go backwards relative to the previous record,
              otherwise efficiency cannot be derived.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError message={error} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Vehicle" required>
                <Select
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  required
                  disabled={lockedVehicleId !== undefined}
                >
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.displayName ?? vehicle.plateNumber} ({vehicle.plateNumber})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date and time" required>
                <TextInput
                  type="datetime-local"
                  value={loggedAt}
                  onChange={(e) => setLoggedAt(e.target.value)}
                  required
                />
              </Field>
              <Field label="Odometer (km)" required>
                <TextInput
                  type="number"
                  min={0}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  required
                />
              </Field>
              <Field label="Litres" required>
                <TextInput
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={litres}
                  onChange={(e) => setLitres(e.target.value)}
                  required
                />
              </Field>
              <Field label={`Total cost (${currencyCode})`} required>
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  required
                />
              </Field>
              <Field label="Station">
                <TextInput
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                  placeholder="Ceypetco Udawalawe"
                />
              </Field>
              <Field label="Receipt reference">
                <TextInput
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} />
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
                {pending ? "Saving…" : "Save fill-up"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
