"use client";

import { useMemo, useState } from "react";
import { checkAvailability, createPublicBooking, startPaidBooking, RoomAvailability } from "@/features/bookings/actions/booking.actions";
import type { PublicPaymentOptions } from "@/features/payments/services/payment-settings.service";

type PayChoice = "ADVANCE" | "FULL" | "REQUEST";

export function BookingWizard({
  propertyId,
  currencyCode,
  initialCheckIn = "",
  initialCheckOut = "",
  initialGuests = 2,
  payment = null,
}: {
  propertyId: string;
  /** The property's baseCurrency, so rates are shown in the money they are set in. */
  currencyCode: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  /** Null or payNow=false: requests only, as before. */
  payment?: PublicPaymentOptions | null;
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
  const [guests, setGuests] = useState(initialGuests);
  const [availableRooms, setAvailableRooms] = useState<RoomAvailability[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  
  // Guest Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [payChoice, setPayChoice] = useState<PayChoice>(payment?.payNow ? "ADVANCE" : "REQUEST");

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

  // Beds across the rooms picked so far, so the guest is told before they
  // submit that two adults will not fit the party they searched for.
  const selectedCapacity = availableRooms
    .filter((r) => selectedRoomTypes.includes(r.roomType.id))
    .reduce((sum, r) => sum + r.roomType.capacity, 0);
  const tooSmall = selectedRoomTypes.length > 0 && selectedCapacity < guests;

  // An estimate for the screen; the server works out the real charge from the
  // rates it locks in, so a tampered page cannot change what is charged.
  const nights =
    checkInDate && checkOutDate
      ? Math.max(0, Math.round((Date.parse(checkOutDate) - Date.parse(checkInDate)) / 86_400_000))
      : 0;
  const picked = availableRooms.filter((r) => selectedRoomTypes.includes(r.roomType.id));
  const allPriced = picked.length > 0 && picked.every((r) => r.roomType.basePrice !== null);
  const canPayNow = Boolean(payment?.payNow) && allPriced && nights > 0;
  const stayTotal = allPriced
    ? picked.reduce((sum, r) => sum + (r.roomType.basePrice ?? 0) * nights, 0) * (1 + (payment?.taxPercent ?? 0) / 100)
    : 0;
  const advance = payment ? Math.min(stayTotal, Math.max(10, Math.ceil((stayTotal * payment.advancePercent) / 100))) : 0;
  const effectiveChoice: PayChoice = canPayNow ? payChoice : "REQUEST";

  const handlePay = async () => {
    if (!firstName || !lastName || !email) {
      setError("Please fill out all guest details.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await startPaidBooking(
      { firstName, lastName, email, phone: phone || undefined },
      { propertyId, roomTypeIds: selectedRoomTypes, checkInDate: new Date(checkInDate), checkOutDate: new Date(checkOutDate) },
      guests,
      effectiveChoice,
    );
    if (result.success && result.data) {
      // Off to the Payments.lk card page; keep the button disabled meanwhile.
      window.location.href = result.data.checkoutUrl;
      return;
    }
    setLoading(false);
    setError(result.error || "Payment could not be started.");
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
      },
      guests
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <div>
                <label htmlFor="booking-guests" className="block text-sm font-medium text-stone-500 mb-2">Guests</label>
                <select
                  id="booking-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full p-4 rounded-lg bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 focus:border-emerald-500 focus:outline-none dark:text-white transition-colors"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? "Adult" : "Adults"}</option>
                  ))}
                </select>
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
            
            {tooSmall && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                The rooms you have picked sleep {selectedCapacity}, but you are booking for {guests}. Add another room, or email us and we will sort out the right fit.
              </p>
            )}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="w-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-4 rounded-lg font-medium transition-colors">
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={selectedRoomTypes.length === 0 || tooSmall}
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

            {canPayNow && payment && (
              <fieldset className="mb-8">
                <legend className="text-sm font-medium text-stone-500 mb-3">How would you like to book?</legend>
                <div className="space-y-3">
                  {(
                    [
                      {
                        value: "ADVANCE" as const,
                        title: `Pay ${payment.advancePercent}% now`,
                        amount: currency.format(advance),
                        note: `Instantly confirmed. The rest (${currency.format(Math.max(0, stayTotal - advance))}) is paid at the resort.`,
                      },
                      {
                        value: "FULL" as const,
                        title: "Pay in full now",
                        amount: currency.format(stayTotal),
                        note: "Instantly confirmed. Nothing to pay on arrival except extras.",
                      },
                      {
                        value: "REQUEST" as const,
                        title: "Request only, pay at the resort",
                        amount: "No payment now",
                        note: "We hold the room and confirm with you by email or phone.",
                      },
                    ]
                  ).filter((o) => !(o.value === "ADVANCE" && payment.advancePercent >= 100)).map((o) => (
                    <label
                      key={o.value}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${payChoice === o.value ? "border-emerald-500 bg-emerald-500/5" : "border-stone-200 dark:border-stone-800 hover:border-emerald-500/50"}`}
                    >
                      <input
                        type="radio"
                        name="pay-choice"
                        value={o.value}
                        checked={payChoice === o.value}
                        onChange={() => setPayChoice(o.value)}
                        className="mt-1 accent-emerald-600"
                      />
                      <span className="flex-1">
                        <span className="flex flex-wrap justify-between gap-2">
                          <span className="font-medium text-stone-900 dark:text-stone-100">{o.title}</span>
                          <span className="font-medium text-stone-900 dark:text-stone-100">{o.amount}</span>
                        </span>
                        <span className="block text-sm text-stone-500 mt-0.5">{o.note}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-stone-500 mt-3 leading-relaxed">
                  Card payments are processed securely by Payments.lk; we never see your card number.{" "}
                  {payment.freeCancelDays > 0
                    ? `Free cancellation up to ${payment.freeCancelDays} day${payment.freeCancelDays === 1 ? "" : "s"} before arrival, with a full refund of what you paid. After that, online payments are non-refundable.`
                    : "Online payments are non-refundable."}
                  {payment.taxPercent ? ` Prices include ${payment.taxPercent}% tax.` : ""}
                </p>
              </fieldset>
            )}

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="w-full bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-900 dark:text-stone-100 py-4 rounded-lg font-medium transition-colors">
                Back
              </button>
              <button 
                onClick={effectiveChoice === "REQUEST" ? handleBook : handlePay}
                disabled={loading || !firstName || !lastName || !email}
                className="w-full bg-emerald-700 hover:bg-emerald-600 text-white py-4 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {effectiveChoice === "REQUEST"
                  ? loading ? "Sending..." : "Send Booking Request"
                  : loading ? "Opening secure payment..." : `Pay ${currency.format(effectiveChoice === "FULL" ? stayTotal : advance)} securely`}
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
