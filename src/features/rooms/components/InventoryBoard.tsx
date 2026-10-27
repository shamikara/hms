"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble,
  Building2,
  Check,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import type { Inventory, InventoryRoom, InventoryRoomType } from "@/features/rooms/actions/inventory.actions";
import {
  archiveRoom,
  archiveRoomType,
  createBuilding,
  createFloor,
  createRoom,
  createRoomType,
  setHousekeeping,
  updateRoom,
  updateRoomType,
} from "@/features/rooms/actions/inventory.actions";

type Action = () => Promise<{ success: boolean; error?: string }>;

const HOUSEKEEPING_STYLES: Record<InventoryRoom["housekeeping"], string> = {
  CLEAN: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border-emerald-800/40",
  DIRTY: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border-amber-800/40",
  INSPECTED: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border-blue-800/40",
};

const STATUS_STYLES: Record<InventoryRoom["status"], string> = {
  AVAILABLE: "text-stone-500",
  MAINTENANCE: "text-amber-500",
  OUT_OF_ORDER: "text-rose-500",
};

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";
const card =
  "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm";

export function InventoryBoard({
  inventory,
  loadError,
  canManage,
}: {
  inventory: Inventory | null;
  loadError?: string;
  /** False for housekeeping-only roles, who may still mark rooms made up. */
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editingType, setEditingType] = useState<InventoryRoomType | null>(null);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<InventoryRoom | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showPlaces, setShowPlaces] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const run = (action: Action, message: string, onDone?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(message);
        onDone?.();
        router.refresh();
      } else {
        setError(result.error ?? "That did not work.");
      }
    });
  };

  if (!inventory) {
    return (
      <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{loadError ?? "The room inventory could not be loaded."}</span>
      </div>
    );
  }

  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: inventory.currencyCode,
    maximumFractionDigits: 0,
  });

  const noPlaces = inventory.floors.length === 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Room Inventory</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            The rooms you have, what they cost, and whether they are made up. The booking screen
            sells exactly what is listed here.
          </p>
        </div>
      </div>

      {(error || loadError) && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error ?? loadError}</span>
        </div>
      )}

      {canManage && inventory.roomTypes.length === 0 && (
        <div className="bg-emerald-500/5 border border-emerald-700/40 rounded-2xl p-6 text-sm text-stone-600 dark:text-stone-300 space-y-2">
          <p className="font-medium text-stone-900 dark:text-white">Nothing is set up yet.</p>
          <p>
            Add a room type first (what a room <em>is</em>, and what it costs), then a building and
            floor to put rooms on, then the rooms themselves. Until a room exists, the website has
            nothing to sell.
          </p>
        </div>
      )}

      {/* ----------------------------------------------------- room types */}
      <section className={`${card} overflow-hidden`}>
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <h2 className="font-serif text-lg text-stone-900 dark:text-white">Room Types &amp; Rates</h2>
          </div>
          {canManage && (
            <button
              onClick={() => {
                setEditingType(null);
                setShowTypeForm((v) => !v);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Type
            </button>
          )}
        </header>

        {canManage && (showTypeForm || editingType) && (
          <RoomTypeForm
            key={editingType?.id ?? "new"}
            initial={editingType}
            currency={inventory.currencyCode}
            busy={isPending}
            onCancel={() => {
              setShowTypeForm(false);
              setEditingType(null);
            }}
            onSubmit={(values) =>
              run(
                () => (editingType ? updateRoomType(editingType.id, values) : createRoomType(values)),
                editingType ? "Room type updated." : "Room type added.",
                () => {
                  setShowTypeForm(false);
                  setEditingType(null);
                },
              )
            }
          />
        )}

        {inventory.roomTypes.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">No room types yet.</p>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {inventory.roomTypes.map((type) => (
              <li key={type.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-stone-100">{type.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Sleeps {type.capacity} · {type.roomCount} room{type.roomCount === 1 ? "" : "s"}
                    {type.description ? ` · ${type.description}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {type.basePrice === null ? (
                      <span className="text-amber-500 text-xs font-mono">Rate not set</span>
                    ) : (
                      <>
                        {money.format(type.basePrice)}
                        <span className="text-xs text-stone-500 font-normal"> / night</span>
                      </>
                    )}
                  </span>
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowTypeForm(false);
                          setEditingType(type);
                        }}
                        className="px-3 py-1.5 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 text-stone-500 hover:text-emerald-500 rounded-lg text-[11px] font-mono uppercase transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => run(() => archiveRoomType(type.id), `Archived ${type.name}.`)}
                        disabled={isPending}
                        className="p-1.5 border border-stone-200 dark:border-stone-800 hover:border-rose-600 text-stone-500 hover:text-rose-500 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={`Archive ${type.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ------------------------------------------------ buildings/floors */}
      {canManage && (
        <section className={`${card} overflow-hidden`}>
          <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <h2 className="font-serif text-lg text-stone-900 dark:text-white">Buildings &amp; Floors</h2>
            </div>
            <button
              onClick={() => setShowPlaces((v) => !v)}
              className="px-4 py-2 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 text-stone-500 hover:text-emerald-500 text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors"
            >
              {showPlaces ? "Close" : "Manage"}
            </button>
          </header>

          <div className="px-6 py-4 flex flex-wrap gap-2">
            {inventory.floors.length === 0 ? (
              <p className="text-sm text-stone-500">
                No floors yet — rooms need one. Even a single-storey guesthouse needs one building
                and one floor to hang rooms from.
              </p>
            ) : (
              inventory.floors.map((floor) => (
                <span
                  key={floor.id}
                  className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-mono"
                >
                  {floor.label}
                </span>
              ))
            )}
          </div>

          {showPlaces && (
            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-stone-200 dark:border-stone-800 pt-6">
              <SimpleForm
                title="Add a building"
                busy={isPending}
                fields={[{ name: "name", label: "Name", placeholder: "Main House" }]}
                onSubmit={(values) =>
                  run(() => createBuilding(values), "Building added.")
                }
              />
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-stone-900 dark:text-white">Add a floor</h3>
                {inventory.buildings.length === 0 ? (
                  <p className="text-xs text-stone-500">Add a building first.</p>
                ) : (
                  <FloorForm
                    buildings={inventory.buildings}
                    busy={isPending}
                    onSubmit={(values) => run(() => createFloor(values), "Floor added.")}
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------------------------------------------------------- rooms */}
      <section className={`${card} overflow-hidden`}>
        <header className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BedDouble className="w-4 h-4 text-emerald-500" />
            <h2 className="font-serif text-lg text-stone-900 dark:text-white">Rooms</h2>
          </div>
          {canManage && (
            <button
              onClick={() => {
                setEditingRoom(null);
                setShowRoomForm((v) => !v);
              }}
              disabled={noPlaces || inventory.roomTypes.length === 0}
              title={
                noPlaces
                  ? "Add a building and floor first"
                  : inventory.roomTypes.length === 0
                    ? "Add a room type first"
                    : undefined
              }
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Room
            </button>
          )}
        </header>

        {canManage && (showRoomForm || editingRoom) && (
          <RoomForm
            key={editingRoom?.id ?? "new"}
            initial={editingRoom}
            inventory={inventory}
            busy={isPending}
            onCancel={() => {
              setShowRoomForm(false);
              setEditingRoom(null);
            }}
            onSubmit={(values) =>
              run(
                () => (editingRoom ? updateRoom(editingRoom.id, values) : createRoom(values)),
                editingRoom ? "Room updated." : "Room added.",
                () => {
                  setShowRoomForm(false);
                  setEditingRoom(null);
                },
              )
            }
          />
        )}

        {inventory.rooms.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-stone-500">
            No rooms yet. Nothing can be booked until there is at least one.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-mono text-stone-500 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="px-6 py-3">Room</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Where</th>
                  <th className="px-6 py-3">Sellable</th>
                  <th className="px-6 py-3">Housekeeping</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {inventory.rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors">
                    <td className="px-6 py-3 font-mono font-semibold text-stone-900 dark:text-stone-100">
                      {room.roomNumber}
                      {room.occupied && (
                        <span className="ml-2 text-[10px] font-mono text-emerald-500 uppercase">Occupied</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-stone-600 dark:text-stone-300">{room.roomTypeName}</td>
                    <td className="px-6 py-3 text-xs text-stone-500 font-mono">{room.floorLabel}</td>
                    <td className={`px-6 py-3 text-xs font-mono ${STATUS_STYLES[room.status]}`}>
                      {room.status.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex gap-1.5">
                        {(["CLEAN", "DIRTY", "INSPECTED"] as const).map((state) => (
                          <button
                            key={state}
                            onClick={() =>
                              run(
                                () => setHousekeeping({ roomId: room.id, housekeeping: state }),
                                `Room ${room.roomNumber} marked ${state.toLowerCase()}.`,
                              )
                            }
                            disabled={isPending || room.housekeeping === state}
                            className={`px-2 py-1 rounded-md border text-[10px] font-mono uppercase transition-colors disabled:cursor-default ${
                              room.housekeeping === state
                                ? HOUSEKEEPING_STYLES[state]
                                : "border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            }`}
                          >
                            {state === "INSPECTED" ? "✓✓" : state.slice(0, 5)}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {canManage && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setShowRoomForm(false);
                              setEditingRoom(room);
                            }}
                            className="px-3 py-1.5 border border-stone-200 dark:border-stone-800 hover:border-emerald-600 text-stone-500 hover:text-emerald-500 rounded-lg text-[11px] font-mono uppercase transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => run(() => archiveRoom(room.id), `Archived room ${room.roomNumber}.`)}
                            disabled={isPending}
                            className="p-1.5 border border-stone-200 dark:border-stone-800 hover:border-rose-600 text-stone-500 hover:text-rose-500 rounded-lg transition-colors disabled:opacity-50"
                            aria-label={`Archive room ${room.roomNumber}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- forms */

function RoomTypeForm({
  initial,
  currency,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: InventoryRoomType | null;
  currency: string;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    capacity: String(initial?.capacity ?? 2),
    basePrice: initial?.basePrice === null || initial?.basePrice === undefined ? "" : String(initial.basePrice),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="px-6 py-5 bg-stone-50 dark:bg-stone-950/50 border-b border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
    >
      <div>
        <label className={label}>Name</label>
        <input
          className={input}
          required
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          placeholder="Deluxe Double Room"
        />
      </div>
      <div>
        <label className={label}>Sleeps</label>
        <input
          className={input}
          type="number"
          min={1}
          required
          value={values.capacity}
          onChange={(e) => setValues({ ...values, capacity: e.target.value })}
        />
      </div>
      <div>
        <label className={label}>Rate / night ({currency})</label>
        <input
          className={input}
          value={values.basePrice}
          onChange={(e) => setValues({ ...values, basePrice: e.target.value })}
          placeholder="Blank = on request"
        />
      </div>
      <div className="sm:col-span-2 lg:col-span-1">
        <label className={label}>Description</label>
        <input
          className={input}
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
          placeholder="Shown on the website"
        />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-stone-200 dark:border-stone-800 text-stone-500 rounded-xl text-xs font-medium"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider flex items-center gap-2"
        >
          <Check className="w-3.5 h-3.5" /> {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

function RoomForm({
  initial,
  inventory,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: InventoryRoom | null;
  inventory: Inventory;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState({
    roomNumber: initial?.roomNumber ?? "",
    roomTypeId: initial?.roomTypeId ?? inventory.roomTypes[0]?.id ?? "",
    floorId: initial?.floorId ?? inventory.floors[0]?.id ?? "",
    status: initial?.status ?? "AVAILABLE",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="px-6 py-5 bg-stone-50 dark:bg-stone-950/50 border-b border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
    >
      <div>
        <label className={label}>Room number</label>
        <input
          className={input}
          required
          value={values.roomNumber}
          onChange={(e) => setValues({ ...values, roomNumber: e.target.value })}
          placeholder="101"
        />
      </div>
      <div>
        <label className={label}>Type</label>
        <select
          className={input}
          value={values.roomTypeId}
          onChange={(e) => setValues({ ...values, roomTypeId: e.target.value })}
        >
          {inventory.roomTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Floor</label>
        <select
          className={input}
          value={values.floorId}
          onChange={(e) => setValues({ ...values, floorId: e.target.value })}
        >
          {inventory.floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Sellable</label>
        <select
          className={input}
          value={values.status}
          onChange={(e) => setValues({ ...values, status: e.target.value as InventoryRoom["status"] })}
        >
          <option value="AVAILABLE">Available</option>
          <option value="MAINTENANCE">Maintenance</option>
          <option value="OUT_OF_ORDER">Out of order</option>
        </select>
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-stone-200 dark:border-stone-800 text-stone-500 rounded-xl text-xs font-medium"
        >
          <X className="w-3.5 h-3.5" />
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider flex items-center gap-2"
        >
          <Check className="w-3.5 h-3.5" /> {initial ? "Save" : "Add"}
        </button>
      </div>
    </form>
  );
}

function SimpleForm({
  title,
  fields,
  busy,
  onSubmit,
}: {
  title: string;
  fields: { name: string; label: string; placeholder?: string }[];
  busy: boolean;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-3"
    >
      <h3 className="text-sm font-medium text-stone-900 dark:text-white">{title}</h3>
      {fields.map((field) => (
        <div key={field.name}>
          <label className={label}>{field.label}</label>
          <input
            className={input}
            required
            value={values[field.name] ?? ""}
            onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            placeholder={field.placeholder}
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={busy}
        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider"
      >
        Add
      </button>
    </form>
  );
}

function FloorForm({
  buildings,
  busy,
  onSubmit,
}: {
  buildings: { id: string; name: string }[];
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState({ buildingId: buildings[0]?.id ?? "", level: "0" });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="space-y-3"
    >
      <div>
        <label className={label}>Building</label>
        <select
          className={input}
          value={values.buildingId}
          onChange={(e) => setValues({ ...values, buildingId: e.target.value })}
        >
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>
          <Layers className="inline w-3 h-3 mr-1" />
          Level (0 for ground)
        </label>
        <input
          className={input}
          type="number"
          required
          value={values.level}
          onChange={(e) => setValues({ ...values, level: e.target.value })}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-mono uppercase tracking-wider"
      >
        Add
      </button>
    </form>
  );
}
