"use client";

import { useState } from "react";
import { 
  UserCheck, 
  LogOut, 
  Plus, 
  CheckCircle2, 
  Calendar, 
  Search, 
  Key, 
  X, 
  Building, 
  User, 
  ShieldCheck, 
  Filter,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface ReservationItem {
  id: string;
  guestName: string;
  email: string;
  phone: string;
  passport: string;
  roomType: string;
  roomNumber?: string;
  checkInDate: string;
  checkOutDate: string;
  status: "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
  totalAmount: number;
}

const initialReservations: ReservationItem[] = [
  {
    id: "RES-9901",
    guestName: "Alexander Wright",
    email: "alexander.wright@luxurytravel.com",
    phone: "+44 7700 900077",
    passport: "GB-8890123",
    roomType: "Presidential Safari Villa",
    roomNumber: "Villa 101",
    checkInDate: "2026-07-23",
    checkOutDate: "2026-07-26",
    status: "CONFIRMED",
    totalAmount: 3600,
  },
  {
    id: "RES-9902",
    guestName: "Sophia Martinez",
    email: "sophia.m@natureestates.org",
    phone: "+1 312 555 0199",
    passport: "US-4412098",
    roomType: "Family Wilderness Suite",
    roomNumber: "Suite 201",
    checkInDate: "2026-07-23",
    checkOutDate: "2026-07-25",
    status: "CONFIRMED",
    totalAmount: 1700,
  },
  {
    id: "RES-9903",
    guestName: "Marcus Vance",
    email: "marcus.vance@safarijournal.com",
    phone: "+61 412 000 888",
    passport: "AU-9918234",
    roomType: "Luxury Canvas Pavilion",
    roomNumber: "Canvas 301",
    checkInDate: "2026-07-22",
    checkOutDate: "2026-07-24",
    status: "CHECKED_IN",
    totalAmount: 900,
  },
  {
    id: "RES-9904",
    guestName: "Emily Watson",
    email: "emily.watson@globaltours.co.uk",
    phone: "+44 20 7946 0912",
    passport: "GB-1029384",
    roomType: "Luxury Canvas Pavilion",
    roomNumber: "Canvas 302",
    checkInDate: "2026-07-20",
    checkOutDate: "2026-07-22",
    status: "CHECKED_OUT",
    totalAmount: 900,
  },
];

export default function BookingsPage() {
  const [reservations, setReservations] = useState<ReservationItem[]>(initialReservations);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedResForCheckIn, setSelectedResForCheckIn] = useState<ReservationItem | null>(null);
  const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Check-In Modal Form State
  const [assignedRoom, setAssignedRoom] = useState("Villa 101");
  const [keyCardIssued, setKeyCardIssued] = useState(true);

  // Walk-In Modal Form State
  const [walkInForm, setWalkInForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roomType: "Presidential Safari Villa",
    roomNumber: "Villa 102",
    checkInDate: format(new Date(), "yyyy-MM-dd"),
    checkOutDate: format(new Date(Date.now() + 86400000 * 2), "yyyy-MM-dd"),
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleCheckInConfirm = () => {
    if (!selectedResForCheckIn) return;
    setReservations((prev) =>
      prev.map((r) =>
        r.id === selectedResForCheckIn.id
          ? { ...r, status: "CHECKED_IN", roomNumber: assignedRoom }
          : r
      )
    );
    showToast(`Checked in ${selectedResForCheckIn.guestName} to ${assignedRoom}! Keycard activated.`);
    setSelectedResForCheckIn(null);
  };

  const handleCheckOutConfirm = (id: string, guestName: string) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "CHECKED_OUT" } : r))
    );
    showToast(`Successfully checked out ${guestName}. Folio closed.`);
  };

  const handleWalkInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInForm.firstName || !walkInForm.lastName || !walkInForm.email) {
      alert("Please fill in guest first name, last name, and email.");
      return;
    }
    const newRes: ReservationItem = {
      id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
      guestName: `${walkInForm.firstName} ${walkInForm.lastName}`,
      email: walkInForm.email,
      phone: walkInForm.phone || "+94 77 123 4567",
      passport: "PASSPORT-VERIFIED",
      roomType: walkInForm.roomType,
      roomNumber: walkInForm.roomNumber,
      checkInDate: walkInForm.checkInDate,
      checkOutDate: walkInForm.checkOutDate,
      status: "CHECKED_IN",
      totalAmount: 1800,
    };
    setReservations([newRes, ...reservations]);
    setIsWalkInModalOpen(false);
    showToast(`Walk-in guest ${newRes.guestName} checked in to ${newRes.roomNumber}!`);
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = statusFilter === "ALL" || r.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-900 border border-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-900 dark:text-white tracking-tight">
            Guest Check-In & Reservations
          </h1>
          <p className="text-stone-500 dark:text-stone-400 mt-1.5 text-sm">
            Manage arrivals, process instant room check-ins, assign keycards, and handle departures.
          </p>
        </div>

        <button
          onClick={() => setIsWalkInModalOpen(true)}
          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono uppercase tracking-wider rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Walk-In Check In</span>
        </button>
      </div>

      {/* Quick Search & Filters */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest name, email, or reservation ID..."
            className="w-full pl-10 pr-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl bg-stone-50/50 dark:bg-stone-950/50 text-sm outline-none focus:ring-2 focus:ring-emerald-600/50 text-stone-900 dark:text-stone-100"
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
          {["ALL", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-xl border font-mono text-[11px] uppercase transition-colors ${
                statusFilter === status
                  ? "bg-emerald-950 text-emerald-400 border-emerald-800 font-semibold"
                  : "bg-stone-50 dark:bg-stone-950 text-stone-500 border-stone-200 dark:border-stone-800 hover:text-stone-900 dark:hover:text-stone-200"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-500 dark:text-stone-400">
            <thead className="bg-stone-50 dark:bg-stone-950 text-xs uppercase font-mono text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
              <tr>
                <th className="px-6 py-4">Reservation ID</th>
                <th className="px-6 py-4">Guest Details</th>
                <th className="px-6 py-4">Room & Stay</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
              {filteredReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-stone-500">
                    No matching reservations found.
                  </td>
                </tr>
              ) : (
                filteredReservations.map((res) => (
                  <tr
                    key={res.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-950/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-stone-900 dark:text-stone-100">
                      {res.id}
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900 dark:text-stone-100">{res.guestName}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{res.email}</p>
                      <p className="text-[11px] text-stone-500 font-mono mt-0.5">{res.phone}</p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-800 dark:text-stone-200 text-xs">{res.roomType}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded font-mono text-[10px]">
                        {res.roomNumber || "Unassigned"}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                      <div>In: {res.checkInDate}</div>
                      <div className="text-stone-400">Out: {res.checkOutDate}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={res.status} />
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {res.status === "CONFIRMED" && (
                        <button
                          onClick={() => {
                            setSelectedResForCheckIn(res);
                            setAssignedRoom(res.roomNumber || "Villa 101");
                          }}
                          className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold font-mono uppercase tracking-wider transition-colors shadow-sm inline-flex items-center space-x-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Check In</span>
                        </button>
                      )}

                      {res.status === "CHECKED_IN" && (
                        <button
                          onClick={() => handleCheckOutConfirm(res.id, res.guestName)}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors inline-flex items-center space-x-1.5"
                        >
                          <LogOut className="w-3.5 h-3.5 text-amber-400" />
                          <span>Check Out</span>
                        </button>
                      )}

                      {res.status === "CHECKED_OUT" && (
                        <span className="text-xs font-mono text-stone-400 italic">Folio Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Check-In Modal */}
      {selectedResForCheckIn && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-6 text-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif font-semibold text-lg">Process Guest Check-In</h3>
              </div>
              <button
                onClick={() => setSelectedResForCheckIn(null)}
                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-1">
                <p className="font-semibold text-white text-base">{selectedResForCheckIn.guestName}</p>
                <p className="text-xs text-stone-400">{selectedResForCheckIn.email} • {selectedResForCheckIn.phone}</p>
                <p className="text-xs text-stone-500 font-mono pt-1">Passport: {selectedResForCheckIn.passport}</p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1.5">
                  Assign Room Unit
                </label>
                <select
                  value={assignedRoom}
                  onChange={(e) => setAssignedRoom(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Villa 101">Presidential Safari Villa 101 (Available)</option>
                  <option value="Villa 102">Presidential Safari Villa 102 (Available)</option>
                  <option value="Suite 201">Family Wilderness Suite 201 (Available)</option>
                  <option value="Canvas 301">Luxury Canvas Pavilion 301 (Available)</option>
                  <option value="Canvas 304">Luxury Canvas Pavilion 304 (Available)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-stone-950 border border-stone-800">
                <div className="flex items-center space-x-2.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium">Issue Digital NFC Keycard</span>
                </div>
                <input
                  type="checkbox"
                  checked={keyCardIssued}
                  onChange={(e) => setKeyCardIssued(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-stone-800">
              <button
                onClick={() => setSelectedResForCheckIn(null)}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckInConfirm}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-colors shadow-lg flex items-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Check-In</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-In Check-In Wizard Modal */}
      {isWalkInModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleWalkInSubmit}
            className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-6 text-stone-100 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center pb-4 border-b border-stone-800">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-serif font-semibold text-lg">Instant Walk-In Guest Check-In</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="p-1 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={walkInForm.firstName}
                  onChange={(e) => setWalkInForm({ ...walkInForm, firstName: e.target.value })}
                  placeholder="e.g. Liam"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={walkInForm.lastName}
                  onChange={(e) => setWalkInForm({ ...walkInForm, lastName: e.target.value })}
                  placeholder="e.g. Hemsworth"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={walkInForm.email}
                  onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                  placeholder="e.g. liam@resort.com"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Room Type</label>
                <select
                  value={walkInForm.roomType}
                  onChange={(e) => setWalkInForm({ ...walkInForm, roomType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Presidential Safari Villa">Presidential Safari Villa ($1,200/n)</option>
                  <option value="Family Wilderness Suite">Family Wilderness Suite ($850/n)</option>
                  <option value="Luxury Canvas Pavilion">Luxury Canvas Pavilion ($450/n)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Assign Room Unit</label>
                <select
                  value={walkInForm.roomNumber}
                  onChange={(e) => setWalkInForm({ ...walkInForm, roomNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Villa 102">Villa 102</option>
                  <option value="Suite 201">Suite 201</option>
                  <option value="Canvas 301">Canvas 301</option>
                  <option value="Canvas 304">Canvas 304</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setIsWalkInModalOpen(false)}
                className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-colors shadow-lg flex items-center space-x-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Complete Check-In</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationItem["status"] }) {
  if (status === "CHECKED_IN") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-800/40 flex items-center space-x-1 w-fit">
        <UserCheck className="w-3 h-3" />
        <span>CHECKED IN</span>
      </span>
    );
  }
  if (status === "CONFIRMED") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400 border border-blue-800/40 flex items-center space-x-1 w-fit">
        <ShieldCheck className="w-3 h-3" />
        <span>CONFIRMED</span>
      </span>
    );
  }
  if (status === "CHECKED_OUT") {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400 flex items-center space-x-1 w-fit">
        <LogOut className="w-3 h-3" />
        <span>CHECKED OUT</span>
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400 flex items-center space-x-1 w-fit">
      <span>CANCELLED</span>
    </span>
  );
}
