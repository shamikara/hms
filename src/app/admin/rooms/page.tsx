"use client";

import { useState } from "react";
import { BedDouble, CheckCircle2, AlertCircle, Wrench, Sparkles, Filter, Plus } from "lucide-react";

interface RoomItem {
  id: string;
  number: string;
  name: string;
  type: string;
  floor: string;
  status: "AVAILABLE" | "OCCUPIED" | "CLEANING" | "MAINTENANCE";
  capacity: number;
  rate: number;
}

const mockRooms: RoomItem[] = [
  { id: "r1", number: "101", name: "Presidential Safari Villa 1", type: "Villa", floor: "Ground", status: "OCCUPIED", capacity: 4, rate: 1200 },
  { id: "r2", number: "102", name: "Presidential Safari Villa 2", type: "Villa", floor: "Ground", status: "AVAILABLE", capacity: 4, rate: 1200 },
  { id: "r3", number: "201", name: "Family Wilderness Suite A", type: "Suite", floor: "Upper", status: "AVAILABLE", capacity: 6, rate: 850 },
  { id: "r4", number: "202", name: "Family Wilderness Suite B", type: "Suite", floor: "Upper", status: "CLEANING", capacity: 6, rate: 850 },
  { id: "r5", number: "301", name: "Luxury Canvas Pavilion 1", type: "Canvas", floor: "East Wing", status: "AVAILABLE", capacity: 2, rate: 450 },
  { id: "r6", number: "302", name: "Luxury Canvas Pavilion 2", type: "Canvas", floor: "East Wing", status: "OCCUPIED", capacity: 2, rate: 450 },
  { id: "r7", number: "303", name: "Luxury Canvas Pavilion 3", type: "Canvas", floor: "East Wing", status: "MAINTENANCE", capacity: 2, rate: 450 },
  { id: "r8", number: "304", name: "Luxury Canvas Pavilion 4", type: "Canvas", floor: "East Wing", status: "AVAILABLE", capacity: 2, rate: 450 },
];

export default function RoomsPage() {
  const [filter, setFilter] = useState<string>("ALL");

  const filteredRooms = filter === "ALL" 
    ? mockRooms 
    : mockRooms.filter(r => r.status === filter);

  const counts = {
    total: mockRooms.length,
    available: mockRooms.filter(r => r.status === "AVAILABLE").length,
    occupied: mockRooms.filter(r => r.status === "OCCUPIED").length,
    cleaning: mockRooms.filter(r => r.status === "CLEANING").length,
    maintenance: mockRooms.filter(r => r.status === "MAINTENANCE").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out select-none">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">Room Inventory & Status</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Monitor real-time room occupancy, housekeeping states, and nightly rates across Lily Resort.
          </p>
        </div>
        <div className="flex space-x-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2.5 bg-stone-100 dark:bg-stone-850 hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-mono uppercase tracking-wider rounded-xl transition-colors border border-stone-200 dark:border-stone-800 flex items-center justify-center space-x-2">
            <Filter className="w-3.5 h-3.5" />
            <span>Room Types</span>
          </button>
          <button className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Inventory</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Total Units" count={counts.total} sub="100% Capacity" active={filter === "ALL"} onClick={() => setFilter("ALL")} />
        <MetricCard label="Available" count={counts.available} sub="Ready for Check-in" color="emerald" active={filter === "AVAILABLE"} onClick={() => setFilter("AVAILABLE")} />
        <MetricCard label="Occupied" count={counts.occupied} sub="In-house Guests" color="blue" active={filter === "OCCUPIED"} onClick={() => setFilter("OCCUPIED")} />
        <MetricCard label="Turnover / Maint" count={counts.cleaning + counts.maintenance} sub="Housekeeping Required" color="amber" active={filter === "CLEANING" || filter === "MAINTENANCE"} onClick={() => setFilter("CLEANING")} />
      </div>

      {/* Room Grid */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-medium text-stone-900 dark:text-white font-serif">
            Live Unit Board ({filteredRooms.length})
          </h2>

          <div className="flex flex-wrap gap-2 text-xs">
            {["ALL", "AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"].map((st) => (
              <button
                key={st}
                onClick={() => setFilter(st)}
                className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] uppercase transition-colors ${
                  filter === st
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800 font-semibold"
                    : "bg-stone-50 dark:bg-stone-950 text-stone-500 border-stone-200 dark:border-stone-800 hover:text-stone-900 dark:hover:text-stone-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-950/50 space-y-4 hover:border-emerald-700/50 transition-all group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-2xl font-serif text-stone-900 dark:text-stone-100 font-bold block">
                    #{room.number}
                  </span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                    {room.floor} • {room.type}
                  </span>
                </div>
                <StatusBadge status={room.status} />
              </div>

              <div className="pt-2 border-t border-stone-200 dark:border-stone-850 space-y-1">
                <p className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">{room.name}</p>
                <div className="flex justify-between text-[11px] text-stone-500 font-mono pt-1">
                  <span>Cap: {room.capacity} Guests</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">${room.rate}/night</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RoomItem["status"] }) {
  if (status === "AVAILABLE") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-800/40 flex items-center space-x-1">
        <CheckCircle2 className="w-3 h-3" />
        <span>AVAILABLE</span>
      </span>
    );
  }
  if (status === "OCCUPIED") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 border border-blue-800/40 flex items-center space-x-1">
        <BedDouble className="w-3 h-3" />
        <span>OCCUPIED</span>
      </span>
    );
  }
  if (status === "CLEANING") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-800/40 flex items-center space-x-1">
        <Sparkles className="w-3 h-3" />
        <span>TURNOVER</span>
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-800/40 flex items-center space-x-1">
      <Wrench className="w-3 h-3" />
      <span>MAINT</span>
    </span>
  );
}

function MetricCard({ label, count, sub, color, active, onClick }: { label: string; count: number; sub: string; color?: string; active?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border transition-all cursor-pointer ${
        active 
          ? "bg-stone-900 border-emerald-600 text-white shadow-md" 
          : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-900 dark:text-stone-100 hover:border-stone-400"
      }`}
    >
      <span className="text-xs font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">{label}</span>
      <div className="text-3xl font-serif font-bold tracking-tight">{count}</div>
      <p className="text-[11px] text-stone-400 mt-1">{sub}</p>
    </div>
  );
}
