"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const rooms = [
  {
    id: 1,
    title: "Deluxe Double Room",
    description: "An air-conditioned double with one queen bed, a private bathroom and a desk.",
    price: "Rates on request",
    image: "/room-deluxe-double.webp",
  },
  {
    id: 2,
    title: "Deluxe Quadruple Room",
    description: "Two queen beds and a view over the pool — room for four.",
    price: "Rates on request",
    image: "/room-twin-purple.webp",
  },
  {
    id: 3,
    title: "Family Junior Suite",
    description: "Our most spacious room, with two queen beds and space for up to six.",
    price: "Rates on request",
    image: "/room-quadruple.webp", 
  }
];

export function RoomCarousel() {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -400, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 400, behavior: "smooth" });
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex justify-between items-end mb-8">
        <div>
          <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-4 block">Accommodation</span>
          <h3 className="text-4xl md:text-5xl font-serif leading-tight">Sanctuary in the Tropics</h3>
        </div>
        <div className="hidden md:flex gap-4">
          <button onClick={scrollLeft} className="w-12 h-12 rounded-full border border-stone-700 flex items-center justify-center hover:bg-stone-800 hover:border-emerald-500 transition-colors">
            <span className="text-stone-300">←</span>
          </button>
          <button onClick={scrollRight} className="w-12 h-12 rounded-full border border-stone-700 flex items-center justify-center hover:bg-stone-800 hover:border-emerald-500 transition-colors">
            <span className="text-stone-300">→</span>
          </button>
        </div>
      </div>

      <div 
        ref={carouselRef}
        className="flex gap-8 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-8"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {rooms.map((room) => (
          <div 
            key={room.id}
            className="min-w-[85vw] md:min-w-[400px] lg:min-w-[500px] snap-center group cursor-pointer hover:-translate-y-2 transition-transform duration-300 ease-out"
          >
            <div className="relative h-[400px] lg:h-[500px] w-full rounded-sm overflow-hidden mb-6">
              <Image 
                src={room.image} 
                alt={room.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-110 transition-transform duration-[1500ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-6 left-6 right-6">
                <span className="text-emerald-400 font-medium text-sm block mb-2">{room.price}</span>
                <h4 className="text-2xl font-serif text-white mb-2">{room.title}</h4>
              </div>
            </div>
            <p className="text-stone-400 leading-relaxed mb-4">{room.description}</p>
            <Link href="/rooms" className="text-emerald-400 text-sm font-medium uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-2 group/link">
              Explore Room <span className="group-hover/link:translate-x-2 transition-transform">→</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
