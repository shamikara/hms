"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarSync, Check, Copy, Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { confirmAction } from "@/components/ui/confirm-dialog";
import { showToast } from "@/components/ui/toast";
import {
  addConnection,
  removeConnection,
  rotateExportLink,
  syncNow,
  updateConnection,
  type ChannelBoardData,
  type ChannelConnectionRow,
} from "../actions/channel.actions";

const card = "rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900";
const input =
  "w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600/40";
const small =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-emerald-600 hover:text-emerald-600 disabled:opacity-40";

function ago(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

export function ChannelBoard({ data, canManage, origin }: { data: ChannelBoardData; canManage: boolean; origin: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      if (r.success) showToast(ok);
      else showToast(r.error ?? "That did not work.", "error");
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif text-stone-900 dark:text-stone-50 flex items-center gap-2">
            <CalendarSync className="w-6 h-6 text-emerald-600" /> Booking.com &amp; Agoda sync
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-3xl">
            Keeps each room&apos;s calendar in step with the booking sites, so a room sold on one is closed on the others.
            For every room and site: paste the site&apos;s calendar link here, and paste our link into the site. Links are
            re-read before every guest search and booking, and when you press Sync now.
          </p>
        </div>
        {canManage && (
          <button
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await syncNow();
                if (r.success && r.data) showToast(`Synced ${r.data.ok} calendar${r.data.ok === 1 ? "" : "s"}${r.data.failed ? `, ${r.data.failed} failed` : ""}.`, r.data.failed ? "error" : "success");
                router.refresh();
              })
            }
          >
            <RefreshCw className={`w-4 h-4 ${pending ? "animate-spin" : ""}`} /> Sync now
          </button>
        )}
      </div>

      {data.conflicts.length > 0 && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300">
          <p className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4" /> Possible double booking
          </p>
          <ul className="mt-2 space-y-1">
            {data.conflicts.map((c, i) => (
              <li key={i}>
                Room {c.roomNumber}: {c.source} has {day(c.start)} → {day(c.end)} closed, and{" "}
                <a className="underline" href={`/admin/bookings/${c.reservationId}`}>
                  {c.guestName}
                </a>{" "}
                is booked here. Move one guest or contact the booking site.
              </li>
            ))}
          </ul>
        </div>
      )}

      <details className={`${card} p-5 text-sm text-stone-600 dark:text-stone-300`}>
        <summary className="cursor-pointer font-semibold text-stone-900 dark:text-white">How to connect a room (5 minutes)</summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Below, under the room, click <strong>Add site</strong> and choose Booking.com or Agoda.</li>
          <li>
            <strong>Booking.com:</strong> Extranet → Rates &amp; Availability → Calendar → <em>Sync calendars</em> → Add calendar
            connection. Paste <strong>our link</strong> (Copy button) there, and copy Booking.com&apos;s export link back into
            the box here.
          </li>
          <li>
            <strong>Agoda:</strong> YCS → Calendar → <em>Calendar connections</em>. Same two steps: import our link, copy
            Agoda&apos;s export link here.
          </li>
          <li>Match the right room on each site (one connection per room per site). Repeat for each room.</li>
          <li>Booking sites re-read our link every 1–3 hours, so leave a little buffer for last-minute bookings.</li>
        </ol>
      </details>

      <div className="space-y-4">
        {data.rooms.map((room) => (
          <RoomCard key={room.roomId} room={room} canManage={canManage} origin={origin} pending={pending} run={run} />
        ))}
        {data.rooms.length === 0 && <p className="text-sm text-stone-500">No rooms yet. Add rooms in Room Inventory first.</p>}
      </div>
    </div>
  );
}

function RoomCard({
  room,
  canManage,
  origin,
  pending,
  run,
}: {
  room: ChannelBoardData["rooms"][number];
  canManage: boolean;
  origin: string;
  pending: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("Booking.com");
  const [url, setUrl] = useState("");

  return (
    <section className={`${card} overflow-hidden`}>
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 px-5 py-3">
        <div>
          <span className="font-semibold text-stone-900 dark:text-white">Room {room.roomNumber}</span>
          <span className="ml-2 text-sm text-stone-500">{room.roomTypeName}</span>
        </div>
        {canManage && !adding && (
          <button className={small} onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" /> Add site
          </button>
        )}
      </header>

      {room.connections.length === 0 && !adding && (
        <p className="px-5 py-4 text-sm text-stone-500">Not connected to any booking site.</p>
      )}

      <ul className="divide-y divide-stone-100 dark:divide-stone-800">
        {room.connections.map((c) => (
          <ConnectionRow key={c.id} c={c} canManage={canManage} origin={origin} pending={pending} run={run} />
        ))}
      </ul>

      {adding && (
        <form
          className="grid gap-3 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/40 px-5 py-4 sm:grid-cols-[180px_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addConnection({ roomId: room.roomId, name, importUrl: url || undefined }), `${name} added to room ${room.roomNumber}.`);
            setAdding(false);
            setUrl("");
          }}
        >
          <select className={input} value={name} onChange={(e) => setName(e.target.value)} aria-label="Booking site">
            {["Booking.com", "Agoda", "Airbnb", "Expedia", "Other"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste the site's calendar export link (https://…ics). You can add it later." />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-50">
              <Check className="w-4 h-4" /> Add
            </button>
            <button type="button" className={small} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ConnectionRow({
  c,
  canManage,
  origin,
  pending,
  run,
}: {
  c: ChannelConnectionRow;
  canManage: boolean;
  origin: string;
  pending: boolean;
  run: (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => void;
}) {
  const [url, setUrl] = useState(c.importUrl ?? "");
  const exportUrl = `${origin}${c.exportPath}`;
  const dirty = url !== (c.importUrl ?? "");

  return (
    <li className="px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-stone-900 dark:text-white">{c.name}</span>
          {!c.importUrl ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">Their link not added yet</span>
          ) : c.lastStatus === "error" ? (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">Last read failed</span>
          ) : (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Synced {ago(c.lastSyncedAt)}
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex gap-1.5">
            {c.importUrl && (
              <button className={small} disabled={pending} onClick={() => run(() => syncNow(c.id), `${c.name} synced.`)}>
                <RefreshCw className="w-3.5 h-3.5" /> Sync
              </button>
            )}
            <button
              className={`${small} hover:border-red-500 hover:text-red-600`}
              disabled={pending}
              onClick={async () => {
                const ok = await confirmAction({
                  title: `Remove ${c.name} from this room?`,
                  message: `Dates sold on ${c.name} will stop blocking this room here, and ${c.name} will stop seeing our bookings once you remove our link there too.`,
                  confirmLabel: "Remove",
                });
                if (ok) run(() => removeConnection(c.id), `${c.name} removed.`);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {c.lastError && <p className="text-xs text-red-600">{c.lastError}</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium text-stone-500">1. Our link → paste into {c.name} (import)</p>
          <div className="flex gap-2">
            <input className={`${input} font-mono text-xs`} readOnly value={exportUrl} onFocus={(e) => e.target.select()} />
            <button
              type="button"
              className={small}
              onClick={async () => {
                await navigator.clipboard.writeText(exportUrl).catch(() => {});
                showToast("Link copied.");
              }}
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
          </div>
          {canManage && (
            <button
              type="button"
              className="mt-1 text-[11px] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              onClick={async () => {
                const ok = await confirmAction({
                  title: "Make a new link?",
                  message: `The current link stops working at once. You will need to paste the new one into ${c.name}. Only do this if the link was shared by mistake.`,
                  confirmLabel: "Make new link",
                  tone: "warning",
                });
                if (ok) run(() => rotateExportLink(c.id), "New link made. Paste it into the booking site.");
              }}
            >
              Make a new link
            </button>
          )}
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-stone-500">2. {c.name}&apos;s link → paste here (export from {c.name})</p>
          <div className="flex gap-2">
            <input
              className={`${input} font-mono text-xs`}
              value={url}
              disabled={!canManage}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…ics"
            />
            {canManage && (
              <button
                type="button"
                className={small}
                disabled={!dirty || pending}
                onClick={() => run(() => updateConnection({ id: c.id, name: c.name, importUrl: url }), url ? `${c.name} link saved and read.` : `${c.name} link removed.`)}
              >
                <Link2 className="w-3.5 h-3.5" /> Save
              </button>
            )}
          </div>
        </div>
      </div>

      {c.upcomingBlocks.length > 0 && (
        <p className="text-xs text-stone-500">
          Closed on {c.name}:{" "}
          {c.upcomingBlocks.map((b) => `${day(b.start)} → ${day(b.end)}`).join(" · ")}
        </p>
      )}
    </li>
  );
}
