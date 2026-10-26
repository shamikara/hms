"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  LogOut,
  Plus,
  CheckCircle2,
  Search,
  X,
  ShieldCheck,
  Clock,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import type { DeskReservation, DeskStatus } from "@/features/admin/actions/reservations.actions";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  confirmReservation,
  createWalkInReservation,
} from "@/features/admin/actions/reservations.actions";
import { checkAvailability, type RoomAvailability } from "@/features/bookings/actions/booking.actions";

const FILTERS: Array<{ value: "ALL" | DeskStatus; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CHECKED_IN", label: "In house" },
  { value: "CHECKED_OUT", label: "Departed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function isoToday(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return format(d, "yyyy-MM-dd");
}

export function BookingsBoard({
  reservations,
  propertyId,
  loadError,
}: {
  reservations: DeskReservation[];
  /** Null when the install has no property yet; the walk-in form needs one. */
  propertyId: string | null;
  loadError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | DeskStatus>("ALL");
  const [toast, setToast] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  /**
   * Runs a server action, then pulls the page's data again.
   *
   * The actions revalidate the route, but this is a client component rendered
   * from a server one — without the refresh the table would keep showing the
   * state the row was in before the action ran.
   */
  const run = (action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        setToast(successMessage);
        router.refresh();
      } else {
        setActionError(result.error ?? "That did not work. Please try again.");
      }
    });
  };

  const filtered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return reservations.filter((r) => {
      const matchesSearch =
        needle === "" ||
        r.guestName.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle) ||
        r.reference.toLowerCase().includes(needle);
      const matchesFilter = statusFilter === "ALL" || r.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [reservations, searchQuery, statusFilter]);

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
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">
            Guest Check-In &amp; Reservations
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Confirm requests from the website, record arrivals and departures.
          </p>
        </div>

        <button
          onClick={() => setIsWalkInOpen(true)}
          disabled={!propertyId}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Walk-In Check In</span>
        </button>
      </div>

      {(loadError || actionError) && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{loadError ?? actionError}</span>
        </div>
      )}

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest name, email, or reference..."
            className="w-full pl-10 pr-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-950/50 text-sm outline-none focus:ring-2 focus:ring-emerald-600/50 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-2 rounded-xl border font-mono text-[11px] uppercase transition-colors ${
                statusFilter === filter.value
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800 font-semibold"
                  : "bg-stone-50 dark:bg-stone-950 text-stone-500 border-stone-200 dark:border-stone-800 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-500 dark:text-stone-400">
            <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-mono text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Room</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                    {reservations.length === 0
                      ? "No reservations yet. Bookings taken on the website appear here."
                      : "No reservations match this search."}
                  </td>
                </tr>
              ) : (
                filtered.map((res) => (
                  <tr key={res.id} className="hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      {res.reference}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900 dark:text-stone-100">{res.guestName}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{res.email}</p>
                      {res.phone && <p className="text-[11px] text-stone-500 font-mono mt-0.5">{res.phone}</p>}
                    </td>

                    <td className="px-6 py-4">
                      {res.roomTypeNames.length === 0 ? (
                        <span className="text-xs text-stone-500 italic">No room assigned</span>
                      ) : (
                        <>
                          <p className="font-medium text-stone-800 dark:text-stone-200 text-xs">
                            {res.roomTypeNames.join(", ")}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded font-mono text-[10px]">
                            {res.roomNumbers.join(", ")}
                          </span>
                        </>
                      )}
                      {res.estimatedTotal !== null && (
                        <p className="text-[11px] text-stone-500 mt-1">
                          Est.{" "}
                          {new Intl.NumberFormat(undefined, {
                            style: "currency",
                            currency: res.currencyCode,
                            maximumFractionDigits: 0,
                          }).format(res.estimatedTotal)}
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                      <div>In: {res.checkInDate}</div>
                      <div className="text-stone-400">Out: {res.checkOutDate}</div>
                      <div className="text-stone-500 mt-0.5">
                        {res.nights} night{res.nights === 1 ? "" : "s"}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={res.status} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        {res.status === "PENDING" && (
                          <button
                            onClick={() => run(() => confirmReservation(res.id), `Confirmed ${res.guestName}.`)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors shadow-sm inline-flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Confirm</span>
                          </button>
                        )}

                        {(res.status === "PENDING" || res.status === "CONFIRMED") && (
                          <button
                            onClick={() => run(() => checkInReservation(res.id), `Checked in ${res.guestName}.`)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors shadow-sm inline-flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Check In</span>
                          </button>
                        )}

                        {res.status === "CHECKED_IN" && (
                          <button
                            onClick={() => run(() => checkOutReservation(res.id), `Checked out ${res.guestName}.`)}
                            disabled={isPending}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5 text-amber-400" />
                            <span>Check Out</span>
                          </button>
                        )}

                        {(res.status === "PENDING" || res.status === "CONFIRMED") && (
                          <button
                            onClick={() => run(() => cancelReservation(res.id), `Cancelled ${res.guestName}.`)}
                            disabled={isPending}
                            className="px-3 py-1.5 border border-stone-200 dark:border-stone-800 hover:border-red-500/50 hover:text-red-500 disabled:opacity-50 text-stone-500 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors"
                          >
                            Cancel
                          </button>
                        )}

                        {res.status === "CHECKED_OUT" && (
                          <span className="text-xs font-mono text-stone-400 italic">Departed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isWalkInOpen && propertyId && (
        <WalkInModal
          propertyId={propertyId}
          onClose={() => setIsWalkInOpen(false)}
          onDone={(message) => {
            setIsWalkInOpen(false);
            setToast(message);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function WalkInModal({
  propertyId,
  onClose,
  onDone,
}: {
  propertyId: string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roomTypeId: "",
    checkInDate: isoToday(),
    checkOutDate: isoToday(1),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * Availability, tagged with the dates it was fetched for.
   *
   * Keeping the key alongside the result means "the dates moved and we have
   * not heard back yet" is derived rather than stored, so the effect never
   * has to reset state on its way in.
   */
  const [availability, setAvailability] = useState<{
    key: string;
    rooms: RoomAvailability[];
    error: string | null;
  } | null>(null);

  const dateKey = `${form.checkInDate}:${form.checkOutDate}`;

  // Re-check whenever the dates move: the list of rooms that are actually free
  // is the whole point, and a stale list would let the desk promise a room
  // that is already taken.
  useEffect(() => {
    let cancelled = false;
    const [checkIn, checkOut] = dateKey.split(":");

    checkAvailability(propertyId, new Date(checkIn), new Date(checkOut))
      .then((result) => {
        if (cancelled) return;
        setAvailability({
          key: dateKey,
          rooms: result.success && result.data ? result.data : [],
          error: result.success ? null : (result.error ?? "Could not check availability."),
        });
      })
      .catch(() => {
        if (cancelled) return;
        setAvailability({ key: dateKey, rooms: [], error: "Could not check availability." });
      });

    return () => {
      cancelled = true;
    };
  }, [propertyId, dateKey]);

  // Null while the dates and the last answer disagree, i.e. still loading.
  const current = availability?.key === dateKey ? availability : null;
  const bookable = current?.rooms.filter((r) => r.availableCount > 0) ?? [];

  // The chosen room has to be one that is still free; otherwise fall back to
  // the first that is, so the select never shows a room nobody can have.
  const selectedRoomTypeId = bookable.some((r) => r.roomType.id === form.roomTypeId)
    ? form.roomTypeId
    : (bookable[0]?.roomType.id ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRoomTypeId) {
      setError("Choose a room that is free for these dates.");
      return;
    }

    setSaving(true);
    const result = await createWalkInReservation({ ...form, roomTypeId: selectedRoomTypeId });
    setSaving(false);

    if (result.success) {
      onDone(`Checked in ${form.firstName} ${form.lastName}.`);
    } else {
      setError(result.error ?? "Could not create the booking.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-6 text-stone-100 animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        <div className="flex justify-between items-center pb-4 border-b border-stone-800">
          <div className="flex items-center space-x-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif font-semibold text-lg">Walk-In Check In</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(error || current?.error) && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl p-3 text-sm">
            {error ?? current?.error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <Field label="First Name *">
            <input
              type="text"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Last Name *">
            <input
              type="text"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Email Address *">
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+94 77 123 4567"
              className={inputClass}
            />
          </Field>

          <Field label="Check In">
            <input
              type="date"
              required
              value={form.checkInDate}
              onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
              className={inputClass}
            />
          </Field>

          <Field label="Check Out">
            <input
              type="date"
              required
              value={form.checkOutDate}
              onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
              className={inputClass}
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Room">
              {current === null ? (
                <p className="text-xs text-stone-400 py-2.5">Checking what is free…</p>
              ) : bookable.length === 0 ? (
                <p className="text-xs text-amber-400 py-2.5">
                  Nothing is free for these dates. Try different dates.
                </p>
              ) : (
                <select
                  value={selectedRoomTypeId}
                  onChange={(e) => setForm({ ...form, roomTypeId: e.target.value })}
                  className={inputClass}
                >
                  {bookable.map((room) => (
                    <option key={room.roomType.id} value={room.roomType.id}>
                      {room.roomType.name} — {room.availableCount} free
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || bookable.length === 0}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-colors shadow-lg flex items-center space-x-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{saving ? "Saving…" : "Complete Check-In"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-mono uppercase text-stone-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: DeskStatus }) {
  const styles: Record<DeskStatus, { className: string; icon: React.ReactNode; label: string }> = {
    PENDING: {
      className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-800/40",
      icon: <Clock className="w-3 h-3" />,
      label: "PENDING",
    },
    CONFIRMED: {
      className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-800/40",
      icon: <ShieldCheck className="w-3 h-3" />,
      label: "CONFIRMED",
    },
    CHECKED_IN: {
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-800/40",
      icon: <UserCheck className="w-3 h-3" />,
      label: "IN HOUSE",
    },
    CHECKED_OUT: {
      className: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400",
      icon: <LogOut className="w-3 h-3" />,
      label: "DEPARTED",
    },
    CANCELLED: {
      className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400",
      icon: <Ban className="w-3 h-3" />,
      label: "CANCELLED",
    },
    NO_SHOW: {
      className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400",
      icon: <Ban className="w-3 h-3" />,
      label: "NO SHOW",
    },
  };

  const style = styles[status];
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold flex items-center space-x-1 w-fit ${style.className}`}
    >
      {style.icon}
      <span>{style.label}</span>
    </span>
  );
}
