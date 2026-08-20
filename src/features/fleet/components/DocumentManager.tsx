"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, FileText, Archive, ExternalLink } from "lucide-react";
import { VehicleDocumentType } from "@prisma/client";
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
  archiveVehicleDocumentAction,
  createVehicleDocumentAction,
  updateVehicleDocumentAction,
} from "../actions/ops.actions";
import type { DocumentRow } from "../repositories/ops.repository";
import { daysUntil, validityStatus } from "../lib/compliance";

/**
 * Compliance documents. Validity is derived from the expiry date on every
 * render, so a certificate cannot silently sit on a stale "valid" flag.
 *
 * An expired insurance or revenue licence grounds the vehicle: the assignment
 * check refuses to put it on a safari.
 */

interface VehicleOption {
  id: string;
  plateNumber: string;
  displayName: string | null;
}

interface DocumentManagerProps {
  documents: DocumentRow[];
  vehicles: VehicleOption[];
  canManage: boolean;
  lockedVehicleId?: string;
}

export function DocumentManager({
  documents,
  vehicles,
  canManage,
  lockedVehicleId,
}: DocumentManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DocumentRow | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [vehicleId, setVehicleId] = React.useState(lockedVehicleId ?? "");
  const [type, setType] = React.useState<VehicleDocumentType>(
    VehicleDocumentType.INSURANCE
  );
  const [documentNumber, setDocumentNumber] = React.useState("");
  const [issueDate, setIssueDate] = React.useState("");
  const [expiryDate, setExpiryDate] = React.useState("");
  const [fileUrl, setFileUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const sorted = React.useMemo(
    () =>
      [...documents].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      ),
    [documents]
  );

  function openCreate() {
    setEditing(null);
    setVehicleId(lockedVehicleId ?? "");
    setType(VehicleDocumentType.INSURANCE);
    setDocumentNumber("");
    setIssueDate("");
    setExpiryDate("");
    setFileUrl("");
    setNotes("");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(document: DocumentRow) {
    setEditing(document);
    setVehicleId(document.vehicleId);
    setType(document.type);
    setDocumentNumber(document.documentNumber);
    setIssueDate(format(new Date(document.issueDate), "yyyy-MM-dd"));
    setExpiryDate(format(new Date(document.expiryDate), "yyyy-MM-dd"));
    setFileUrl(document.fileUrl ?? "");
    setNotes(document.notes ?? "");
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result = editing
      ? await updateVehicleDocumentAction({
          id: editing.id,
          documentNumber,
          issueDate,
          expiryDate,
          fileUrl,
          notes,
        })
      : await createVehicleDocumentAction({
          vehicleId,
          type,
          documentNumber,
          issueDate,
          expiryDate,
          fileUrl,
          notes,
        });

    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Could not save the document.");
      return;
    }
    setDialogOpen(false);
    router.refresh();
  }

  async function handleArchive(document: DocumentRow) {
    if (
      !window.confirm(
        `Archive ${humaniseEnum(document.type)} ${document.documentNumber}? It stays on record for auditing.`
      )
    ) {
      return;
    }
    setPending(true);
    const result = await archiveVehicleDocumentAction({ id: document.id });
    setPending(false);
    if (!result.success) {
      window.alert(result.error ?? "Could not archive the document.");
      return;
    }
    router.refresh();
  }

  return (
    <SectionCard
      title="Vehicle documents"
      subtitle="Insurance, revenue licence, emission and fitness certificates. Validity is derived from the expiry date, never stored."
      action={
        canManage && (
          <Button variant="primary" size="lg" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add document
          </Button>
        )
      }
    >
      {sorted.length === 0 ? (
        <EmptyState message="No documents recorded. A vehicle with no document on file is not treated as expired — but it is also not verified." />
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-800">
              <Th>Vehicle</Th>
              <Th>Document</Th>
              <Th>Number</Th>
              <Th>Issued</Th>
              <Th>Expires</Th>
              <Th>Status</Th>
              <Th>File</Th>
              {canManage && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((document) => {
              const status = validityStatus(new Date(document.expiryDate));
              const days = daysUntil(new Date(document.expiryDate));
              return (
                <tr
                  key={document.id}
                  className="border-b border-stone-100 dark:border-stone-800/70"
                >
                  <Td>
                    <span className="text-xs font-mono">{document.vehicle.plateNumber}</span>
                  </Td>
                  <Td>
                    <span className="text-xs">{humaniseEnum(document.type)}</span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">{document.documentNumber}</span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono text-stone-500">
                      {format(new Date(document.issueDate), "d MMM yyyy")}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-xs font-mono">
                      {format(new Date(document.expiryDate), "d MMM yyyy")}
                    </span>
                    <span className="block text-[11px] text-stone-400">
                      {days < 0 ? `${Math.abs(days)} days ago` : `in ${days} days`}
                    </span>
                  </Td>
                  <Td>
                    <ValidityBadge status={status} />
                  </Td>
                  <Td>
                    {document.fileUrl ? (
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-stone-400">—</span>
                    )}
                  </Td>
                  {canManage && (
                    <Td className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="xs"
                        disabled={pending}
                        onClick={() => openEdit(document)}
                      >
                        Renew / edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={pending}
                        title="Archive document"
                        onClick={() => handleArchive(document)}
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </Button>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              {editing ? "Update document" : "Add vehicle document"}
            </DialogTitle>
            <DialogDescription>
              An expired insurance or revenue licence blocks the vehicle from being
              assigned to a safari.
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
                  disabled={editing !== null || lockedVehicleId !== undefined}
                >
                  <option value="">Select a vehicle…</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.displayName ?? vehicle.plateNumber} ({vehicle.plateNumber})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Document type" required>
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as VehicleDocumentType)}
                  disabled={editing !== null}
                >
                  <EnumOptions values={Object.values(VehicleDocumentType)} />
                </Select>
              </Field>
              <Field label="Document number" required>
                <TextInput
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  required
                />
              </Field>
              <Field label="Issue date" required>
                <TextInput
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Expiry date" required>
                <TextInput
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Scan URL" hint="External URL; no file storage is configured">
                <TextInput
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://…"
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
                {pending ? "Saving…" : "Save document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
