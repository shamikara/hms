import Link from "next/link";
import { getOccupancyGrid } from "@/features/admin/actions/calendar.actions";

const DAY_OPTIONS = [14, 21, 30];

function shiftIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : undefined;
  const span = typeof params.days === "string" ? Number(params.days) : 21;

  const result = await getOccupancyGrid(from, Number.isFinite(span) ? span : 21);
  const grid = result.success ? result.data : undefined;

  const start = grid?.days[0] ?? new Date().toISOString().slice(0, 10);
  const windowDays = grid?.days.length ?? 21;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Availability</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Who is in which room, night by night. A cell is a night; the night of departure belongs
            to nobody.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href={`/admin/calendar?from=${shiftIso(start, -windowDays)}&days=${windowDays}`}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 font-mono text-[11px] uppercase text-stone-500 hover:text-emerald-500 hover:border-emerald-600 transition-colors"
          >
            ← Earlier
          </Link>
          <Link
            href={`/admin/calendar?days=${windowDays}`}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 font-mono text-[11px] uppercase text-stone-500 hover:text-emerald-500 hover:border-emerald-600 transition-colors"
          >
            Today
          </Link>
          <Link
            href={`/admin/calendar?from=${shiftIso(start, windowDays)}&days=${windowDays}`}
            className="px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-800 font-mono text-[11px] uppercase text-stone-500 hover:text-emerald-500 hover:border-emerald-600 transition-colors"
          >
            Later →
          </Link>
          {DAY_OPTIONS.map((option) => (
            <Link
              key={option}
              href={`/admin/calendar?from=${start}&days=${option}`}
              className={`px-3 py-2 rounded-xl border font-mono text-[11px] uppercase transition-colors ${
                windowDays === option
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800 font-semibold"
                  : "border-stone-200 dark:border-stone-800 text-stone-500 hover:text-emerald-500"
              }`}
            >
              {option}d
            </Link>
          ))}
        </div>
      </div>

      {!grid ? (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl p-4 text-sm">
          {result.error ?? "The calendar could not be loaded."}
        </div>
      ) : grid.rows.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-10 text-center text-sm text-stone-500">
          No rooms yet. Add some under{" "}
          <Link href="/admin/rooms" className="text-emerald-500 hover:underline">
            Room Inventory
          </Link>
          .
        </div>
      ) : (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="border-collapse text-sm w-full">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
                  <th className="sticky left-0 z-10 bg-stone-50 dark:bg-stone-950 px-4 py-3 text-left text-xs font-mono uppercase text-stone-500 min-w-[9rem]">
                    Room
                  </th>
                  {grid.days.map((day) => {
                    const date = new Date(`${day}T00:00:00.000Z`);
                    const weekend = [0, 6].includes(date.getUTCDay());
                    return (
                      <th
                        key={day}
                        className={`px-1 py-2 text-[10px] font-mono text-center min-w-[2.6rem] ${
                          weekend ? "text-emerald-500" : "text-stone-500"
                        }`}
                      >
                        <span className="block">{date.getUTCDate()}</span>
                        <span className="block text-[9px] opacity-60">
                          {date.toLocaleDateString(undefined, { weekday: "narrow", timeZone: "UTC" })}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {grid.rows.map((row) => (
                  <tr key={row.roomId}>
                    <th className="sticky left-0 z-10 bg-white dark:bg-stone-900 px-4 py-2 text-left border-r border-stone-200 dark:border-stone-800">
                      <span className="block font-mono text-xs font-semibold text-stone-900 dark:text-stone-100">
                        {row.roomNumber}
                        {row.housekeeping === "DIRTY" && (
                          <span className="ml-1.5 text-amber-500" title="Needs making up">
                            ●
                          </span>
                        )}
                      </span>
                      <span className="block text-[10px] text-stone-500 font-normal truncate max-w-[7rem]">
                        {row.roomTypeName}
                      </span>
                    </th>

                    {grid.days.map((day) => {
                      const night = row.nights[day];
                      const unsellable = row.status !== "AVAILABLE";

                      if (!night) {
                        return (
                          <td
                            key={day}
                            title={unsellable ? row.status.replace(/_/g, " ").toLowerCase() : "Free"}
                            className={`h-11 border-l border-stone-100 dark:border-stone-850 ${
                              unsellable
                                ? "bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(120,113,108,0.25)_3px,rgba(120,113,108,0.25)_6px)]"
                                : ""
                            }`}
                          />
                        );
                      }

                      return (
                        <td
                          key={day}
                          className={`h-11 border-l border-stone-100 dark:border-stone-850 p-0 ${
                            night.checkedIn
                              ? "bg-emerald-600/80"
                              : "bg-blue-600/60"
                          }`}
                        >
                          <Link
                            href={`/admin/bookings/${night.reservationId}`}
                            title={`${night.guestName} · ${night.reference}`}
                            className="flex items-center h-full w-full px-1 overflow-hidden"
                          >
                            {night.isArrival && (
                              <span className="text-[10px] text-white font-medium whitespace-nowrap">
                                {night.guestName.split(" ")[0]}
                              </span>
                            )}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800">
                  <th className="sticky left-0 z-10 bg-stone-50 dark:bg-stone-950 px-4 py-2 text-left text-[10px] font-mono uppercase text-stone-500">
                    Sold
                  </th>
                  {grid.occupancy.map((day) => (
                    <td
                      key={day.date}
                      className="px-1 py-2 text-center text-[10px] font-mono text-stone-500"
                      title={`${day.sold} of ${day.sellable} sellable rooms`}
                    >
                      {day.sold}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap gap-4 text-[10px] font-mono text-stone-500">
            <Legend className="bg-blue-600/60" label="Booked" />
            <Legend className="bg-emerald-600/80" label="In house" />
            <Legend className="bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,rgba(120,113,108,0.25)_3px,rgba(120,113,108,0.25)_6px)]" label="Not sellable" />
            <span className="flex items-center gap-1.5">
              <span className="text-amber-500">●</span> Needs making up
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block w-4 h-3 rounded-sm border border-stone-300 dark:border-stone-700 ${className}`} />
      {label}
    </span>
  );
}
