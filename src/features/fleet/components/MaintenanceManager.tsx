"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Wrench } from "lucide-react";
import { MaintenanceStatus, MaintenanceType } from "@prisma/client";
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
  humaniseEnum,
} from "./FleetPrimitives";
import {
  EnumOptions,
  Field,
  FormError,
  Select,
  TextArea,
  TextInput,
} from "./FleetFormControls";
import {
  createMaintenanceAction,
  updateMaintenanceAction,
} from "../actions/ops.actions";
import type { MaintenanceRow } from "../repositories/ops.repository";

/**
 * Maintenance ledger. Marking a job IN_PROGRESS grounds the vehicle (the server
 * refuses to assign it to a safari), and closing the job releases it.
 */

interface VehicleOption {
  id: string;
  plateNumber: string;
  displayName: string | null;
  currentMileage: number;
}

interface MaintenanceManagerProps {
  records: MaintenanceRow[];
  vehicles: VehicleOption[];
  currencyCode: string;
  canManage: boolean;
  /** Pre-selects a vehicle when embedded on a vehicle detail page. */
  lockedVehicleId?: string;
}

const STATUS_VARIANT: Record<string, "emerald" | "amber" | "blue" | "destructive"> = {
  SCHEDULED: "blue",
  IN_PROGRESS: "amber",
  COMPLETED: "emerald",
  CANCELLED: "destructive",
};

export function MaintenanceManager({
  records,
  vehicles,
  currencyCode,
  canManage,
  lockedVehicleId,
}: MaintenanceManagerProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | MaintenanceStatus>("ALL");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [vehicleId, setVehicleId] = React.useState(lockedVehicleId ?? "");
  const [type, setType] = React.useState<MaintenanceType>(MaintenanceType.GENERAL_SERVICE);
  const [status, setStatus] = React.useState<MaintenanceStatus>(MaintenanceStatus.SCHEDULED);
  const [description, setDescription] = React.useState("");
  const [serviceProvider, setServiceProvider] = React.useState("");
  const [serviceDate, setServiceDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [mileageAtService, setMileageAtService] = React.useState("");
  const [cost, setCost] = React.useState("0");
  const [parts, setParts] = React.useState("");
  const [nextServiceDate, setNextServiceDate] = React.useState("");
  const [nextServiceMileage, setNextServiceMileage] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [documentUrl, setDocumentUrl] = React.useState("");

  const filtered = React.useMemo(
    () =>
      records.filter((record) => statusFilter === "ALL" || record.status === statusFilter),
    [records, statusFilter]
  );

  function openCreate() {
    setVehicleId(lockedVehicleId ?? "");
    setType(MaintenanceType.GENERAL_SERVICE);
    setStatus(MaintenanceStatus.SCHEDULED);
    setDescription("");
    setServiceProvider("");
    setServiceDate(format(new Date(), "yyyy-MM-dd"));
    setMileageAtService("");
    setCost("0");
    setParts("");
    setNextServiceDate("");
    setNextServiceMileage("");
    setNotes("");
    setDocumentUrl("");
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = await createMaintenanceAction({
      vehicleId,
      type,
      status,
      description,
      serviceProvider,
      serviceDate,
      mileageAtService:
        mileageAtService.trim() === "" ? undefined : Number(mileageAtService),
      cost: Number(cost) || 0,
      currencyCode,
      partsReplaced: parts
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0),
      nextServiceDate: nextServiceDate === "" ? undefined : nextServiceDate,
      nextServiceMileage:
        nextServiceMileage.trim() === "" ? undefined : Number(nextServiceMileage),
      notes,
      documentUrl,
    });

    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not save the maintenance record.");
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function handleStatusChange(record: MaintenanceRow, next: MaintenanceStatus) {
    setPending(true);
    const result = await updateMaintenanceAction({ id: record.id, status: next });
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? "Could not update the job status.");
      return;
    }
    router.refresh();
  }

  return (
    <SectionCard
      title="Maintenance"
      subtitle="Service history, workshop jobs and next-service targets."
      action={
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ALL" | MaintenanceStatus)}
            className="w-36 py-1.5 text-xs"
            aria-label="Filter maintenance by status"
          >
            <option value="ALL">All statuses</option>
            <EnumOptions values={Object.values(MaintenanceStatus)} />
          </Select>
          {canManage && (
            <Button variant="primary" size="lg" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Log service
            </Button>
          )}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState
          message={
            records.length === 0
              ? "No maintenance recorded yet. Logging a service with a next-service target is what powers the due/overdue warnings."
              : "No maintenance records match this filter."
          }
        />
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <Th>Vehicle</Th>
              <Th>Type</Th>
              <Th>Description</Th>
              <Th>Service date</Th>
              <Th>Odometer</Th>
              <Th>Cost</Th>
              <Th>Next service</Th>
              <Th>Status</Th>
              {canManage && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((record) => (
              <tr
                key={record.id}
                className="border-b border-stone-100 dark:border-stone-800/70 hover:bg-stone-50/70 dark:hover:bg-stone-950/40"
              >
                <Td>
                  <span className="text-xs font-mono">{record.vehicle.plateNumber}</span>
                </Td>
                <Td>
                  <span className="text-xs">{humaniseEnum(record.type)}</span>
                </Td>
                <Td>
                  <span className="text-xs">{record.description}</span>
                  {record.serviceProvider && (
                    <span className="block text-[11px] text-stone-400">
                      {record.serviceProvider}
                    </span>
                  )}
                  {record.partsReplaced.length > 0 && (
                    <span className="block text-[11px] text-stone-400">
                      Parts: {record.partsReplaced.join(", ")}
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="text-xs font-mono">
                    {format(new Date(record.serviceDate), "d MMM yyyy")}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs font-mono">
                    {record.mileageAtService === null
                      ? "—"
                      : `${record.mileageAtService.toLocaleString()} km`}
                  </span>
                </Td>
                <Td>
                  <span className="text-xs font-mono">
                    {record.currencyCode} {Number(record.cost).toFixed(2)}
                  </span>
                </Td>
                <Td>
                  <span className="text-[11px] font-mono text-stone-500">
                    {record.nextServiceDate
                      ? format(new Date(record.nextServiceDate), "d MMM yyyy")
                      : "—"}
                    {record.nextServiceMileage !== null && (
                      <span className="block">
                        {record.nextServiceMileage.toLocaleString()} km
                      </span>
                    )}
                  </span>
                </Td>
                <Td>
                  <Badge variant={STATUS_VARIANT[record.status] ?? "secondary"}>
                    {humaniseEnum(record.status)}
                  </Badge>
                </Td>
                {canManage && (
                  <Td className="text-right">
                    <Select
                      value=""
                      disabled={pending}
                      aria-label="Change job status"
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusChange(record, e.target.value as MaintenanceStatus);
                        }
                      }}
                      className="w-32 py-1 text-xs"
                    >
                      <option value="">Set status…</option>
                      <EnumOptions values={Object.values(MaintenanceStatus)} />
                    </Select>
                  </Td>
                )}
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
              Log maintenance
            </DialogTitle>
            <DialogDescription>
              Setting a next-service date or odometer target is what makes this vehicle
              appear in the due / overdue warnings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError message={error} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Vehicle" required>
                <Select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  required
                  disabled={lockedVehicleId !== undefined}
                >
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.displayName ?? vehicle.plateNumber} ({vehicle.plateNumber}) ·{" "}
                      {vehicle.currentMileage.toLocaleString()} km
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Maintenance type" required>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as MaintenanceType)}
                >
                  <EnumOptions values={Object.values(MaintenanceType)} />
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                >
                  <EnumOptions values={Object.values(MaintenanceStatus)} />
                </Select>
              </Field>
              <Field label="Service date" required>
                <TextInput
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Service provider">
                <TextInput
                  value={serviceProvider}
                  onChange={(e) => setServiceProvider(e.target.value)}
                  placeholder="Toyota Lanka Service Centre"
                />
              </Field>
              <Field label="Odometer at service (km)">
                <TextInput
                  type="number"
                  min={0}
                  value={mileageAtService}
                  onChange={(e) => setMileageAtService(e.target.value)}
                />
              </Field>
              <Field label={`Cost (${currencyCode})`}>
                <TextInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </Field>
              <Field label="Parts replaced" hint="Comma separated">
                <TextInput
                  value={parts}
                  onChange={(e) => setParts(e.target.value)}
                  placeholder="Oil filter, air filter"
                />
              </Field>
              <Field label="Next service date">
                <TextInput
                  type="date"
                  value={nextServiceDate}
                  onChange={(e) => setNextServiceDate(e.target.value)}
                />
              </Field>
              <Field label="Next service odometer (km)">
                <TextInput
                  type="number"
                  min={0}
                  value={nextServiceMileage}
                  onChange={(e) => setNextServiceMileage(e.target.value)}
                />
              </Field>
              <Field label="Invoice / job card reference">
                <TextInput
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="INV-2026-0043 or a URL"
                />
              </Field>
            </div>

            <Field label="Description" required>
              <TextInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="10,000 km service — oil, filters, brake inspection"
                required
              />
            </Field>

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
                {pending ? "Saving…" : "Save record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
