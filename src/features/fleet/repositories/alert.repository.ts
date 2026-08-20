import prisma from "@/core/db/prisma";
import {
  FleetAlertSeverity,
  FleetAlertStatus,
  FleetAlertType,
  Prisma,
} from "@prisma/client";
import type { FleetTx } from "./vehicle.repository";

export const alertSelect = {
  id: true,
  propertyId: true,
  type: true,
  severity: true,
  status: true,
  title: true,
  message: true,
  dedupeKey: true,
  vehicleId: true,
  driverId: true,
  tripId: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  vehicle: { select: { id: true, plateNumber: true, displayName: true } },
  driver: {
    select: { id: true, employee: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.FleetAlertSelect;

export type AlertRow = Prisma.FleetAlertGetPayload<{ select: typeof alertSelect }>;

export interface AlertUpsertInput {
  propertyId: string;
  type: FleetAlertType;
  severity: FleetAlertSeverity;
  title: string;
  message: string;
  dedupeKey: string;
  vehicleId?: string | null;
  driverId?: string | null;
  tripId?: string | null;
}

export const AlertRepository = {
  async list(filters: {
    propertyId: string;
    status?: FleetAlertStatus;
    statuses?: FleetAlertStatus[];
    take?: number;
  }): Promise<AlertRow[]> {
    const statuses = filters.statuses ?? (filters.status ? [filters.status] : undefined);
    return prisma.fleetAlert.findMany({
      where: {
        propertyId: filters.propertyId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      select: alertSelect,
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: filters.take ?? 50,
    });
  },

  /**
   * Creates the alert, or refreshes the wording of an existing one with the
   * same `dedupeKey`.
   *
   * This is the anti-spam mechanism: the sweep can run as often as it likes and
   * a given "vehicle X service due at 500km" condition still occupies exactly
   * one row. An alert a human already acknowledged is left alone unless its
   * severity has escalated, so acknowledging is not undone on every sweep.
   */
  async upsertByDedupeKey(input: AlertUpsertInput, tx?: FleetTx): Promise<AlertRow> {
    const client = tx ?? prisma;
    const existing = await client.fleetAlert.findUnique({
      where: { dedupeKey: input.dedupeKey },
      select: { id: true, status: true, severity: true },
    });

    if (!existing) {
      return client.fleetAlert.create({
        data: {
          propertyId: input.propertyId,
          type: input.type,
          severity: input.severity,
          title: input.title,
          message: input.message,
          dedupeKey: input.dedupeKey,
          vehicleId: input.vehicleId ?? null,
          driverId: input.driverId ?? null,
          tripId: input.tripId ?? null,
        },
        select: alertSelect,
      });
    }

    const escalated =
      severityRank(input.severity) > severityRank(existing.severity);
    const reopen =
      existing.status !== FleetAlertStatus.OPEN && escalated
        ? { status: FleetAlertStatus.OPEN, resolvedAt: null }
        : {};

    return client.fleetAlert.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        message: input.message,
        severity: input.severity,
        ...reopen,
      },
      select: alertSelect,
    });
  },

  /**
   * Closes alerts of the given types whose `dedupeKey` is no longer produced by
   * the sweep — i.e. the underlying condition has been fixed.
   */
  async resolveStale(
    propertyId: string,
    types: FleetAlertType[],
    liveKeys: string[],
    tx?: FleetTx
  ): Promise<number> {
    const result = await (tx ?? prisma).fleetAlert.updateMany({
      where: {
        propertyId,
        type: { in: types },
        status: { not: FleetAlertStatus.RESOLVED },
        ...(liveKeys.length > 0 ? { dedupeKey: { notIn: liveKeys } } : {}),
      },
      data: { status: FleetAlertStatus.RESOLVED, resolvedAt: new Date() },
    });
    return result.count;
  },

  /**
   * Closes specific alerts by key. Used for a targeted refresh (e.g. after one
   * review lands) where a property-wide stale sweep would close alerts about
   * entities that were never examined.
   */
  async resolveByDedupeKeys(keys: string[], tx?: FleetTx): Promise<number> {
    if (keys.length === 0) return 0;
    const result = await (tx ?? prisma).fleetAlert.updateMany({
      where: { dedupeKey: { in: keys }, status: { not: FleetAlertStatus.RESOLVED } },
      data: { status: FleetAlertStatus.RESOLVED, resolvedAt: new Date() },
    });
    return result.count;
  },

  async setStatus(
    id: string,
    status: FleetAlertStatus,
    tx?: FleetTx
  ): Promise<AlertRow> {
    return (tx ?? prisma).fleetAlert.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === FleetAlertStatus.RESOLVED ? new Date() : null,
      },
      select: alertSelect,
    });
  },

  async countOpen(propertyId: string): Promise<{ total: number; critical: number }> {
    const [total, critical] = await Promise.all([
      prisma.fleetAlert.count({
        where: { propertyId, status: FleetAlertStatus.OPEN },
      }),
      prisma.fleetAlert.count({
        where: {
          propertyId,
          status: FleetAlertStatus.OPEN,
          severity: FleetAlertSeverity.CRITICAL,
        },
      }),
    ]);
    return { total, critical };
  },
};

function severityRank(severity: FleetAlertSeverity): number {
  switch (severity) {
    case FleetAlertSeverity.CRITICAL:
      return 3;
    case FleetAlertSeverity.WARNING:
      return 2;
    default:
      return 1;
  }
}
