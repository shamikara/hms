"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, IdCard, Archive, RotateCcw, ExternalLink } from "lucide-react";
import { DriverEmploymentStatus } from "@prisma/client";
import { format } from "date-fns";
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
  StarDisplay,
  TableShell,
  Td,
  Th,
  ValidityBadge,
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
  archiveDriverAction,
  createDriverAction,
  updateDriverAction,
} from "../actions/drivers.actions";
import type { DriverRow } from "../repositories/driver.repository";
import { LICENSE_EXPIRY_WARNING_DAYS, validityStatus } from "../lib/compliance";

/**
 * Driver register. A driver is always created against an existing `Employee`
 * chosen from the staff directory, so the fleet never grows a second copy of a
 * person's name or contact details.
 */

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface DriverManagerProps {
  drivers: DriverRow[];
  candidates: EmployeeOption[];
  canManage: boolean;
}

type FormState = {
  employeeId: string;
  licenseNumber: string;
  licenseExpiry: string;
  safariExperienceYears: string;
  employmentStatus: DriverEmploymentStatus;
  isAvailable: boolean;
  imageUrl: string;
  notes: string;
};

const emptyForm: FormState = {
  employeeId: "",
  licenseNumber: "",
  licenseExpiry: "",
  safariExperienceYears: "0",
  employmentStatus: DriverEmploymentStatus.ACTIVE,
  isAvailable: true,
  imageUrl: "",
  notes: "",
};

function toForm(driver: DriverRow): FormState {
  return {
    employeeId: driver.employeeId,
    licenseNumber: driver.licenseNumber,
    licenseExpiry: format(driver.licenseExpiry, "yyyy-MM-dd"),
    safariExperienceYears: String(driver.safariExperienceYears),
    employmentStatus: driver.employmentStatus,
    isAvailable: driver.isAvailable,
    imageUrl: driver.imageUrl ?? "",
    notes: driver.notes ?? "",
  };
}

export function DriverManager({ drivers, candidates, canManage }: DriverManagerProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DriverRow | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return drivers.filter((driver) => {
      if (!showArchived && driver.deletedAt !== null) return false;
      if (term === "") return true;
      return [
        driver.employee.firstName,
        driver.employee.lastName,
        driver.employee.employeeId,
        driver.licenseNumber,
      ].some((v) => v.toLowerCase().includes(term));
    });
  }, [drivers, search, showArchived]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(driver: DriverRow) {
    setEditing(driver);
    setForm(toForm(driver));
    setError(null);
    setDialogOpen(true);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const experience = Number(form.safariExperienceYears);
    const payload = {
      licenseNumber: form.licenseNumber,
      licenseExpiry: form.licenseExpiry,
      safariExperienceYears: Number.isFinite(experience) ? experience : 0,
      employmentStatus: form.employmentStatus,
      isAvailable: form.isAvailable,
      notes: form.notes,
      imageUrl: form.imageUrl.trim() === "" ? undefined : form.imageUrl.trim(),
    };

    const result = editing
      ? await updateDriverAction({
          id: editing.id,
          ...payload,
          imageUrl: form.imageUrl.trim() === "" ? null : form.imageUrl.trim(),
        })
      : await createDriverAction({ employeeId: form.employeeId, ...payload });

    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not save the driver.");
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function handleArchive(driver: DriverRow, archive: boolean) {
    const name = `${driver.employee.firstName} ${driver.employee.lastName}`;
    if (!window.confirm(`${archive ? "Archive" : "Restore"} ${name}?`)) return;
    setPending(true);
    const result = await archiveDriverAction({ id: driver.id, archive });
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? "Could not update the driver.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, staff no, licence…"
              className="w-full rounded-lg border border-stone-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100"
            />
          </div>
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
          <Button
            variant="primary"
            size="lg"
            onClick={openCreate}
            disabled={candidates.length === 0}
            title={
              candidates.length === 0
                ? "Every staff member already has a driver profile"
                : undefined
            }
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Register driver
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          message={
            drivers.length === 0
              ? "No safari drivers registered yet. Register an existing staff member as a driver to get started."
              : "No drivers match the current filters."
          }
        />
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <Th>Driver</Th>
              <Th>Licence</Th>
              <Th>Licence validity</Th>
              <Th>Experience</Th>
              <Th>Employment</Th>
              <Th>Roster</Th>
              <Th>Guest rating</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((driver) => {
              const licence = validityStatus(
                driver.licenseExpiry,
                LICENSE_EXPIRY_WARNING_DAYS
              );
              return (
                <tr
                  key={driver.id}
                  className="border-b border-stone-100 dark:border-stone-800/70 hover:bg-stone-50/70 dark:hover:bg-stone-950/40"
                >
                  <Td>
                    <Link
                      href={`/admin/safari/fleet/drivers/${driver.id}`}
                      className="group inline-flex flex-col"
                    >
                      <span className="font-medium text-stone-900 dark:text-stone-100 group-hover:text-emerald-600">
                        {driver.employee.firstName} {driver.employee.lastName}
                        <ExternalLink className="inline w-3 h-3 ml-1 opacity-0 group-hover:opacity-100" />
                      </span>
                      <span className="text-[11px] font-mono text-stone-500">
                        Staff {driver.employee.employeeId}
                      </span>
                    </Link>
                    {driver.deletedAt !== null && (
                      <span className="ml-2 text-[10px] font-mono uppercase text-red-600">
                        archived
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">{driver.licenseNumber}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <ValidityBadge status={licence} />
                      <span className="text-[11px] text-stone-400 font-mono">
                        {format(driver.licenseExpiry, "d MMM yyyy")}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="text-xs">
                      {driver.safariExperienceYears} year
                      {driver.safariExperienceYears === 1 ? "" : "s"}
                    </span>
                  </Td>
                  <Td>
                    <Badge
                      variant={
                        driver.employmentStatus === DriverEmploymentStatus.ACTIVE
                          ? "emerald"
                          : driver.employmentStatus === DriverEmploymentStatus.TERMINATED
                            ? "destructive"
                            : "amber"
                      }
                    >
                      {humaniseEnum(driver.employmentStatus)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={driver.isAvailable ? "emerald" : "secondary"}>
                      {driver.isAvailable ? "Available" : "Off duty"}
                    </Badge>
                  </Td>
                  <Td>
                    <StarDisplay
                      value={Number(driver.ratingAvg ?? NaN)}
                      count={driver.ratingCount}
                    />
                  </Td>
                  <Td className="text-right whitespace-nowrap">
                    {canManage && driver.deletedAt === null && (
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={pending}
                          onClick={() => openEdit(driver)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          title="Archive driver"
                          onClick={() => handleArchive(driver, true)}
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                    {canManage && driver.deletedAt !== null && (
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={pending}
                        onClick={() => handleArchive(driver, false)}
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
              );
            })}
          </tbody>
        </TableShell>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <IdCard className="w-4 h-4 text-emerald-600" />
              {editing
                ? `Edit ${editing.employee.firstName} ${editing.employee.lastName}`
                : "Register a safari driver"}
            </DialogTitle>
            <DialogDescription>
              Drivers are staff members with safari driving credentials. A licence that
              expires before a trip ends blocks the assignment automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormError message={error} />

            {!editing && (
              <Field label="Staff member" required hint="Only staff without a driver profile are listed">
                <Select
                  value={form.employeeId}
                  onChange={(e) => update("employeeId", e.target.value)}
                  required
                >
                  <option value="">Select a staff member…</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.firstName} {candidate.lastName} ({candidate.employeeId})
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Licence number" required>
                <TextInput
                  value={form.licenseNumber}
                  onChange={(e) => update("licenseNumber", e.target.value)}
                  required
                />
              </Field>
              <Field label="Licence expiry" required>
                <TextInput
                  type="date"
                  value={form.licenseExpiry}
                  onChange={(e) => update("licenseExpiry", e.target.value)}
                  required
                />
              </Field>
              <Field label="Safari experience (years)">
                <TextInput
                  type="number"
                  min={0}
                  value={form.safariExperienceYears}
                  onChange={(e) => update("safariExperienceYears", e.target.value)}
                />
              </Field>
              <Field label="Employment status">
                <Select
                  value={form.employmentStatus}
                  onChange={(e) =>
                    update("employmentStatus", e.target.value as DriverEmploymentStatus)
                  }
                >
                  <EnumOptions values={Object.values(DriverEmploymentStatus)} />
                </Select>
              </Field>
              <Field label="Profile image URL">
                <TextInput
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => update("imageUrl", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              <Field label="Roster availability">
                <label className="inline-flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 pt-2">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={(e) => update("isAvailable", e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Available for assignment
                </label>
              </Field>
            </div>

            <Field label="Notes">
              <TextArea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Speaks German, night-drive certified…"
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
                {pending ? "Saving…" : editing ? "Save changes" : "Register driver"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
