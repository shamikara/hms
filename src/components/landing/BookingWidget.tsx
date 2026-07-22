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

  return (
    <div 
      ref={containerRef}
      className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-full shadow-2xl max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4 mt-12 opacity-0"
    >
      <div className="flex-1 flex flex-col md:flex-row gap-4 w-full px-4">
        <div className="flex flex-col flex-1">
          <label className="text-[10px] uppercase tracking-widest text-emerald-300 font-medium ml-1">Check In</label>
          <input 
            type="date" 
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            className="bg-transparent text-white border-b border-white/30 focus:border-emerald-400 focus:outline-none py-1 w-full text-sm placeholder:text-white/50"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-[10px] uppercase tracking-widest text-emerald-300 font-medium ml-1">Check Out</label>
          <input 
            type="date" 
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            className="bg-transparent text-white border-b border-white/30 focus:border-emerald-400 focus:outline-none py-1 w-full text-sm placeholder:text-white/50"
          />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-[10px] uppercase tracking-widest text-emerald-300 font-medium ml-1">Guests</label>
          <select 
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="bg-transparent text-white border-b border-white/30 focus:border-emerald-400 focus:outline-none py-1 w-full text-sm appearance-none cursor-pointer"
          >
            <option value="1" className="bg-stone-900">1 Adult</option>
            <option value="2" className="bg-stone-900">2 Adults</option>
            <option value="3" className="bg-stone-900">3 Adults</option>
            <option value="4" className="bg-stone-900">4 Adults</option>
          </select>
        </div>
      </div>
      <Link href="/book">
        <button className="bg-emerald-700 hover:bg-emerald-600 text-white px-8 py-3 rounded-full text-sm font-medium tracking-wide transition-all w-full md:w-auto shadow-lg shrink-0">
          Check Availability
        </button>
      </Link>
    </div>
  );
}
