"use client";

import { useState } from "react";
import { Compass, ShieldCheck, Sun, Moon, Clock, User, CheckCircle2, AlertTriangle, Plus } from "lucide-react";

interface DispatchItem {
  id: string;
  drive: string;
  time: string;
  vehicle: string;
  guide: string;
  guestsCount: number;
  status: "DEPARTED" | "SCHEDULED" | "COMPLETED";
}

const mockDispatches: DispatchItem[] = [
  { id: "d1", drive: "Dawn Elephant Gathering", time: "05:30 AM – 09:30 AM", vehicle: "Land Cruiser #01 (UDA-7721)", guide: "Chaminda Bandara", guestsCount: 4, status: "COMPLETED" },
  { id: "d2", drive: "Sunset Leopard & Bear Track", time: "03:00 PM – 06:30 PM", vehicle: "Land Cruiser #03 (UDA-8804)", guide: "Saman Kumara", guestsCount: 6, status: "DEPARTED" },
  { id: "d3", drive: "Sunset Elephant Drive B", time: "03:30 PM – 06:30 PM", vehicle: "Land Cruiser #04 (UDA-9112)", guide: "Nimal Perera", guestsCount: 4, status: "SCHEDULED" },
];

const mockSightings = [
  { animal: "Sri Lankan Leopard", location: "Northern Riverbed", time: "35 mins ago", guide: "Saman Kumara", rarity: "RARE" },
  { animal: "Elephant Herd (14 Elephants)", location: "Reservoir South Shore", time: "1 hour ago", guide: "Chaminda Bandara", rarity: "FREQUENT" },
  { animal: "Sloth Bear", location: "Rock Outcrop #3", time: "3 hours ago", guide: "Chaminda Bandara", rarity: "VERY RARE" },
];

export default function SafariPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Safari Operations & Dispatch</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Manage 4x4 fleet assignments, game drive schedules, and ranger dispatch logs across Udawalawe National Park.
          </p>
        </div>
        <button className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto">
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Game Drive</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Active Fleet" value="8/10" sub="Land Cruisers Online" />
        <MetricCard title="Rangers on Duty" value="6" sub="Licensed Trackers" />
        <MetricCard title="Scheduled Drives" value="12" sub="Today's Total Manifest" />
        <MetricCard title="Wildlife Sightings" value="28" sub="Reported Today" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dispatch Manifest */}
        <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-medium text-stone-900 dark:text-white font-serif">
              Today's Dispatch Manifest
            </h2>
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              Live Field Logs
            </span>
          </div>

          <div className="space-y-4">
            {mockDispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-700/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-serif font-semibold text-stone-900 dark:text-stone-100">{dispatch.drive}</h3>
                  </div>
                  <p className="text-xs text-stone-500 font-mono">
                    {dispatch.time} • {dispatch.vehicle}
                  </p>
                  <p className="text-xs text-stone-400">
                    Lead Ranger: <strong className="text-stone-300">{dispatch.guide}</strong> ({dispatch.guestsCount} Guests)
                  </p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase ${
                    dispatch.status === "DEPARTED"
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 border border-amber-800/40"
                      : dispatch.status === "COMPLETED"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-800/40"
                      : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                  }`}
                >
                  {dispatch.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sightings Feed */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="pb-4 border-b border-stone-200 dark:border-stone-800">
            <h2 className="text-lg font-medium text-stone-900 dark:text-white font-serif">
              Real-Time Wildlife Logs
            </h2>
          </div>

          <div className="space-y-4">
            {mockSightings.map((sighting, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-stone-900 dark:text-stone-100 text-sm font-serif">{sighting.animal}</h4>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400 text-[10px] font-mono font-semibold rounded">
                    {sighting.rarity}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-mono">{sighting.location} • {sighting.time}</p>
                <p className="text-[11px] text-stone-400">Reported by Ranger {sighting.guide}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm">
      <h3 className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">{title}</h3>
      <div className="mt-3 text-3xl font-serif text-stone-900 dark:text-white tracking-tight font-bold">{value}</div>
      <p className="text-[11px] text-stone-400 mt-1">{sub}</p>
    </div>
  );
}
