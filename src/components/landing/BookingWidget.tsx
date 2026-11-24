"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DISTANCE, DURATION, EASE } from "@/lib/motion/motionTokens";

export function BookingWidget() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  useGSAP(() => {
    gsap.fromTo(containerRef.current, 
      { opacity: 0, y: DISTANCE.small },
      { 
        opacity: 1, 
        y: 0, 
        duration: DURATION.normal, 
        delay: 1, 
        ease: EASE.luxOut 
      }
    );
  }, { scope: containerRef });

  const bookQuery = new URLSearchParams();
  if (checkIn) bookQuery.set("checkIn", checkIn);
  if (checkOut) bookQuery.set("checkOut", checkOut);
  bookQuery.set("guests", guests);
  const bookHref = bookQuery.toString() ? `/book?${bookQuery}` : "/book";

  const field =
    "w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-3 text-sm text-stone-900 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5 text-left";

  return (
    <div
      ref={containerRef}
      className="mx-auto mt-8 sm:mt-10 w-full max-w-4xl rounded-2xl bg-white p-4 sm:p-5 text-left shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] opacity-0"
    >
      <div className="grid gap-3 sm:gap-4 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-end">
        <div>
          <label htmlFor="home-check-in" className={labelCls}>Check in</label>
          <input id="home-check-in" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="home-check-out" className={labelCls}>Check out</label>
          <input id="home-check-out" type="date" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="home-guests" className={labelCls}>Guests</label>
          <select id="home-guests" value={guests} onChange={(e) => setGuests(e.target.value)} className={`${field} cursor-pointer`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? "adult" : "adults"}</option>
            ))}
          </select>
        </div>
        <Link
          href={bookHref}
          className="inline-flex h-[46px] items-center justify-center rounded-xl bg-emerald-800 px-7 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Check availability
        </Link>
      </div>
    </div>
  );
}
