"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import prisma from "@/core/db/prisma";
import { NO_PROPERTY, requireAdminPermission, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import {
  ChannelError,
  checkImportUrl,
  findConflicts,
  newExportToken,
  syncConnection,
  type ChannelConflict,
} from "../services/channel-sync.service";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

export interface ChannelConnectionRow {
  id: string;
  name: string;
  importUrl: string | null;
  exportPath: string;
  lastSyncedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  upcomingBlocks: { start: string; end: string; summary: string | null }[];
}

export interface ChannelRoomRow {
  roomId: string;
  roomNumber: string;
  roomTypeName: string;
  connections: ChannelConnectionRow[];
}

export interface ChannelBoardData {
  rooms: ChannelRoomRow[];
  conflicts: (Omit<ChannelConflict, "start" | "end"> & { start: string; end: string })[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export async function loadChannelBoard(): Promise<Result<ChannelBoardData>> {
  const guard = await requireAdminPermission("rooms:view");
  if (!guard.ok) return guard.failure;
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { success: false, error: NO_PROPERTY };
  try {
    const now = new Date(Date.now() - 86_400_000);
    const rooms = await prisma.room.findMany({
      where: { deletedAt: null, floor: { building: { propertyId } } },
      orderBy: [{ roomType: { name: "asc" } }, { roomNumber: "asc" }],
      select: {
        id: true,
        roomNumber: true,
        roomType: { select: { name: true } },
        calendarConnections: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            importUrl: true,
            exportToken: true,
            lastSyncedAt: true,
            lastStatus: true,
            lastError: true,
            blocks: {
              where: { endDate: { gt: now } },
              orderBy: { startDate: "asc" },
              take: 6,
              select: { startDate: true, endDate: true, summary: true },
            },
          },
        },
      },
    });
    const conflicts = await findConflicts(propertyId);
    return {
      success: true,
      data: {
        rooms: rooms.map((r) => ({
          roomId: r.id,
          roomNumber: r.roomNumber,
          roomTypeName: r.roomType.name,
          connections: r.calendarConnections.map((c) => ({
            id: c.id,
            name: c.name,
            importUrl: c.importUrl,
            exportPath: `/api/calendar/${c.exportToken}.ics`,
            lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
            lastStatus: c.lastStatus,
            lastError: c.lastError,
            upcomingBlocks: c.blocks.map((b) => ({ start: iso(b.startDate), end: iso(b.endDate), summary: b.summary })),
          })),
        })),
        conflicts: conflicts.map((c) => ({ ...c, start: iso(c.start), end: iso(c.end) })),
      },
    };
  } catch (error) {
    console.error("loadChannelBoard failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Could not load channel sync." };
  }
}

async function manage() {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return { ok: false as const, failure: guard.failure };
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { ok: false as const, failure: { success: false, error: NO_PROPERTY } as Result };
  return { ok: true as const, propertyId };
}

/** The connection, only if its room belongs to this property. */
async function ownedConnection(id: string, propertyId: string) {
  return prisma.calendarConnection.findFirst({
    where: { id, room: { floor: { building: { propertyId } } } },
    select: { id: true },
  });
}

const AddSchema = z.object({
  roomId: z.string().min(1).max(64),
  name: z.string().trim().min(2, "Name the site, e.g. Booking.com").max(40),
  importUrl: z.string().trim().max(2000).optional(),
});

export async function addConnection(input: unknown): Promise<Result> {
  const c = await manage();
  if (!c.ok) return c.failure;
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  try {
    const room = await prisma.room.findFirst({
      where: { id: parsed.data.roomId, deletedAt: null, floor: { building: { propertyId: c.propertyId } } },
      select: { id: true },
    });
    if (!room) return { success: false, error: "That room was not found." };
    const importUrl = parsed.data.importUrl ? checkImportUrl(parsed.data.importUrl).toString() : null;
    const conn = await prisma.calendarConnection.create({
      data: { roomId: room.id, name: parsed.data.name, importUrl, exportToken: newExportToken() },
      select: { id: true },
    });
    if (importUrl) {
      const r = await syncConnection(conn.id);
      revalidatePath("/admin/channels");
      if (!r.ok) return { success: false, error: `Saved, but the first read failed: ${r.error}` };
    }
    revalidatePath("/admin/channels");
    return { success: true };
  } catch (error) {
    if (error instanceof ChannelError) return { success: false, error: error.message };
    console.error("addConnection failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not save." };
  }
}

const UpdateSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(2).max(40),
  importUrl: z.string().trim().max(2000),
});

export async function updateConnection(input: unknown): Promise<Result> {
  const c = await manage();
  if (!c.ok) return c.failure;
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Check the details." };
  try {
    if (!(await ownedConnection(parsed.data.id, c.propertyId))) return { success: false, error: "Not found." };
    const importUrl = parsed.data.importUrl ? checkImportUrl(parsed.data.importUrl).toString() : null;
    await prisma.calendarConnection.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name, importUrl, ...(importUrl ? {} : { lastStatus: null, lastError: null }) },
    });
    if (!importUrl) await prisma.externalBlock.deleteMany({ where: { connectionId: parsed.data.id } });
    else {
      const r = await syncConnection(parsed.data.id);
      revalidatePath("/admin/channels");
      if (!r.ok) return { success: false, error: `Saved, but reading it failed: ${r.error}` };
    }
    revalidatePath("/admin/channels");
    return { success: true };
  } catch (error) {
    if (error instanceof ChannelError) return { success: false, error: error.message };
    return { success: false, error: "That did not save." };
  }
}

export async function syncNow(id?: string): Promise<Result<{ ok: number; failed: number }>> {
  const c = await manage();
  if (!c.ok) return c.failure as Result<{ ok: number; failed: number }>;
  const where = id
    ? { id, room: { floor: { building: { propertyId: c.propertyId } } } }
    : { importUrl: { not: null }, room: { floor: { building: { propertyId: c.propertyId } } } };
  const list = await prisma.calendarConnection.findMany({ where, select: { id: true } });
  const results = await Promise.all(list.map((x) => syncConnection(x.id)));
  revalidatePath("/admin/channels");
  revalidatePath("/admin/calendar");
  return { success: true, data: { ok: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length } };
}

/** New secret export link (the old one stops working; paste the new one into the site). */
export async function rotateExportLink(id: string): Promise<Result> {
  const c = await manage();
  if (!c.ok) return c.failure;
  if (!(await ownedConnection(id, c.propertyId))) return { success: false, error: "Not found." };
  await prisma.calendarConnection.update({ where: { id }, data: { exportToken: newExportToken() } });
  revalidatePath("/admin/channels");
  return { success: true };
}

export async function removeConnection(id: string): Promise<Result> {
  const c = await manage();
  if (!c.ok) return c.failure;
  if (!(await ownedConnection(id, c.propertyId))) return { success: false, error: "Not found." };
  await prisma.calendarConnection.delete({ where: { id } });
  revalidatePath("/admin/channels");
  revalidatePath("/admin/calendar");
  return { success: true };
}
