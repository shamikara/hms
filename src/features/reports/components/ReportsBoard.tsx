"use client";

import { useState } from "react";
import { BarChart3, BedDouble, CalendarRange, Download, Receipt } from "lucide-react";

const input =
  "w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500";
const label = "block text-xs font-mono uppercase text-stone-500 mb-1.5";
const card = "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6 flex flex-col";
const button =
  "mt-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-mono uppercase tracking-wider rounded-xl transition-colors aria-disabled:opacity-50 aria-disabled:pointer-events-none";

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Quick ranges, computed in UTC to match how stay dates are stored. */
function presets() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return [
    { label: "This month", from: iso(new Date(Date.UTC(y, m, 1))), to: iso(new Date(Date.UTC(y, m + 1, 0))) },
    { label: "Last month", from: iso(new Date(Date.UTC(y, m - 1, 1))), to: iso(new Date(Date.UTC(y, m, 0))) },
    { label: "Next 30 days", from: iso(now), to: iso(new Date(now.getTime() + 29 * 86_400_000)) },
    { label: "This year", from: `${y}-01-01`, to: `${y}-12-31` },
  ];
}

export function ReportsBoard({ canFinance }: { canFinance: boolean }) {
  const quick = presets();
  const [from, setFrom] = useState(quick[0].from);
  const [to, setTo] = useState(quick[0].to);
  const [month, setMonth] = useState(quick[0].from.slice(0, 7));

  const rangeOk = Boolean(from && to && to >= from);
  const range = `from=${from}&to=${to}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div>
        <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Reports</h1>
        <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
          Download branded PDF reports to print, file or send to your accountant. Guest bills are on each
          booking&apos;s page.
        </p>
      </div>

      <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <CalendarRange className="w-4 h-4 text-emerald-500" />
          <h2 className="font-serif text-lg text-stone-900 dark:text-white">Period</h2>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-44">
            <label htmlFor="report-from" className={label}>From</label>
            <input id="report-from" type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-44">
            <label htmlFor="report-to" className={label}>To</label>
            <input id="report-to" type="date" className={input} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {quick.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setFrom(p.from);
                  setTo(p.to);
                }}
                className={`px-3 py-2 rounded-lg text-xs border transition-colors ${
                  from === p.from && to === p.to
                    ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5"
                    : "border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:border-stone-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {!rangeOk && <p className="mt-3 text-xs text-red-500">The end date must be on or after the start date.</p>}
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className={card}>
          <BedDouble className="w-5 h-5 text-emerald-600" />
          <h3 className="mt-3 font-serif text-lg text-stone-900 dark:text-white">Bookings</h3>
          <p className="mt-1 mb-5 text-sm text-stone-500">
            Every arrival in the period: guest, room, dates, status and estimated value.
          </p>
          <a href={`/admin/reports/bookings?${range}`} aria-disabled={!rangeOk} className={button}>
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
        </div>

        {canFinance && (
          <div className={card}>
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h3 className="mt-3 font-serif text-lg text-stone-900 dark:text-white">Revenue &amp; payments</h3>
            <p className="mt-1 mb-5 text-sm text-stone-500">
              Charges posted, tax, payments taken by method, refunds, and what is owed today.
            </p>
            <a href={`/admin/reports/revenue?${range}`} aria-disabled={!rangeOk} className={button}>
              <Download className="w-3.5 h-3.5" /> Download PDF
            </a>
          </div>
        )}

        <div className={card}>
          <BarChart3 className="w-5 h-5 text-emerald-600" />
          <h3 className="mt-3 font-serif text-lg text-stone-900 dark:text-white">Occupancy</h3>
          <p className="mt-1 mb-4 text-sm text-stone-500">
            A month&apos;s room chart with rooms sold each night and the occupancy rate.
          </p>
          <div className="mb-4 w-44">
            <label htmlFor="report-month" className={label}>Month</label>
            <input id="report-month" type="month" className={input} value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <a href={`/admin/reports/occupancy?month=${month}`} aria-disabled={!month} className={button}>
            <Download className="w-3.5 h-3.5" /> Download PDF
          </a>
        </div>
      </div>
    </div>
  );
}
