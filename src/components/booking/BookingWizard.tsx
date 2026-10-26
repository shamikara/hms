"use client";

import { useMemo, useState } from "react";
import { checkAvailability, createPublicBooking, RoomAvailability } from "@/features/bookings/actions/booking.actions";

export function BookingWizard({
  propertyId,
  currencyCode,
  initialCheckIn = "",
  initialCheckOut = "",
}: {
  propertyId: string;
  /** The property's baseCurrency, so rates are shown in the money they are set in. */
  currencyCode: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}) {
  // Rebuilt only when the property's currency changes, not on every render.
  const currency = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode],
  );

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [checkInDate, setCheckInDate] = useState(initialCheckIn);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut);
  const [availableRooms, setAvailableRooms] = useState<RoomAvailability[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  
  // Guest Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // The reservation reference the server actually stored.
  const [reference, setReference] = useState<string | null>(null);

  const handleCheckAvailability = async () => {
    if (!checkInDate || !checkOutDate) {
      setError("Please select check-in and check-out dates.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await checkAvailability(propertyId, new Date(checkInDate), new Date(checkOutDate));
    setLoading(false);
    
    if (result.success && result.data) {
      // Sold-out types stay in the list, shown as unavailable: a shorter list
      // reads as "we don't have that room" rather than "not on those dates".
      setAvailableRooms(result.data);
      setStep(2);
    } else {
      setError(result.error || "Failed to check availability.");
    }
  };

  const handleBook = async () => {
    if (!firstName || !lastName || !email) {
      setError("Please fill out all guest details.");
      return;
    }
    setLoading(true);
    setError(null);

    const result = await createPublicBooking(
      { firstName, lastName, email, phone: phone || undefined },
      { 
        propertyId, 
        roomTypeIds: selectedRoomTypes,
        checkInDate: new Date(checkInDate),
        checkOutDate: new Date(checkOutDate),
        status: "DRAFT"
      }
    );

    setLoading(false);
    if (result.success) {
      setReference(result.data?.reference ?? null);
      setStep(4);
    } else {
      setError(result.error || "Booking failed.");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-stone-900 rounded-2xl shadow-2xl p-4 sm:p-8 border border-stone-200 dark:border-stone-800">
      
      {/* Stepper */}
      <div className="flex justify-between items-center mb-8 sm:mb-12 relative">
        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-stone-200 dark:bg-stone-800 -z-10 -translate-y-1/2" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-base rounded-full flex items-center justify-center font-medium transition-colors duration-300 ${step >= i ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-500'}`}>
            {i}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg mb-8 text-sm border border-red-500/20 animate-in fade-in duration-300">
          {error}
        </div>
      )}

      <div className="animate-in fade-in duration-500">
        {step === 1 && (
          <div>
            <h3 className="text-2xl font-serif mb-6 text-stone-900 dark:text-stone-100">Select Dates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">Check-In</label>
                <input 
                  type="date" 
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-500 mb-2">Check-Out</label>
                <input 
                  type="date" 
                  value={checkOutDate}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                />
              </div>
            </div>
            <button 
              onClick={handleCheckAvailability}
              disabled={loading}
              className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-4 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Checking..." : "Check Availability"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 className="text-2xl font-serif mb-6 text-stone-900 dark:text-stone-100">Available Rooms</h3>
            {availableRooms.length === 0 ? (
              <p className="text-stone-500">No rooms available for the selected dates.</p>
            ) : (
              <div className="space-y-4 mb-8">
                {availableRooms.map((room) => (
                  <div
                    key={room.roomType.id}
                    aria-disabled={room.availableCount === 0}
                    className={`p-6 rounded-xl border-2 transition-all flex justify-between items-center gap-4 ${room.availableCount === 0 ? 'border-stone-200 dark:border-stone-800 opacity-50 cursor-not-allowed' : selectedRoomTypes.includes(room.roomType.id) ? 'border-emerald-500 bg-emerald-500/5 cursor-pointer' : 'border-stone-200 dark:border-stone-800 hover:border-emerald-500/50 cursor-pointer'}`}
                    onClick={() => {
                      if (room.availableCount === 0) return;
                      if (selectedRoomTypes.includes(room.roomType.id)) {
                        setSelectedRoomTypes(selectedRoomTypes.filter(id => id !== room.roomType.id));
                      } else {
                        setSelectedRoomTypes([...selectedRoomTypes, room.roomType.id]);
                      }
                    }}
                  >
                    <div>
                      <h4 className="text-xl font-medium text-stone-900 dark:text-stone-100">{room.roomType.name}</h4>
                      {room.roomType.description && (
                        <p className="text-sm text-stone-500 mt-1">{room.roomType.description}</p>
                      )}
                      <p className="text-sm text-stone-500 mt-1">Sleeps {room.roomType.capacity}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {room.roomType.basePrice === null ? (
                        <span className="text-sm text-stone-500 block">Rate on request</span>
                      ) : (
                        <span className="text-lg font-medium text-stone-900 dark:text-stone-100 block">
                          {currency.format(room.roomType.basePrice)}
                          <span className="text-xs text-stone-500 font-normal"> / night</span>
                        </span>
                      )}
                      <span className={`text-sm font-medium block mt-1 ${room.availableCount === 0 ? 'text-stone-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {room.availableCount === 0 ? "None left on these dates" : `${room.availableCount} available`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="w-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-4 rounded-lg font-medium transition-colors">
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={selectedRoomTypes.length === 0}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Continue to Details
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-2xl font-serif mb-6 text-stone-900 dark:text-stone-100">Guest Details</h3>
            <div className="space-y-6 mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">First Name</label>
                  <input 
                    type="text" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">Last Name</label>
                  <input 
                    type="text" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-500 mb-2">
                    Phone <span className="text-stone-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+94 77 123 4567"
                    className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="w-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-4 rounded-lg font-medium transition-colors">
                Back
              </button>
              <button 
                onClick={handleBook}
                disabled={loading || !firstName || !lastName || !email}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Confirming..." : "Confirm Booking"}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
              ✓
            </div>
            <h3 className="text-3xl font-serif mb-4 text-stone-900 dark:text-stone-100">Request Received</h3>
            <p className="text-stone-500 mb-4 max-w-md mx-auto">
              Thank you, {firstName}. We have your request and are holding the room while our
              reservations team confirms it with you directly. It is not confirmed until they do.
            </p>
            {reference && (
              <p className="text-stone-500 mb-8 text-sm">
                Your reference: <span className="font-mono text-stone-900 dark:text-stone-100">{reference}</span>
              </p>
            )}
            <button onClick={() => window.location.href = "/"} className="bg-emerald-700 hover:bg-emerald-600 text-white px-8 py-3 rounded-full font-medium transition-colors">
              Return Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
