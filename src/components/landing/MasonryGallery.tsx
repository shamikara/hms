"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DISTANCE, DURATION, EASE } from "@/lib/motion/motionTokens";

const galleryImages = [
  { id: 1, src: "/safari-elephant-herd.webp", alt: "Wild Elephant Herd at Udawalawe", className: "col-span-2 row-span-2 aspect-square" },
  { id: 2, src: "/safari-elephant-calf.webp", alt: "Elephant Mother and Calf", className: "col-span-1 row-span-1 aspect-square" },
  { id: 3, src: "/pool-day.webp", alt: "The Swimming Pool by Day", className: "col-span-1 row-span-1 aspect-square" },
  { id: 4, src: "/pool-dusk.webp", alt: "Poolside Pergola at Dusk", className: "col-span-2 row-span-1 aspect-[2/1]" },
  { id: 5, src: "/dining-grill.webp", alt: "Sri Lankan Grilled Platters", className: "col-span-1 row-span-1 aspect-square" },
  { id: 6, src: "/dining-rice-curry.webp", alt: "Traditional Rice and Curry", className: "col-span-1 row-span-1 aspect-square" },
  { id: 7, src: "/safari-reservoir.webp", alt: "Udawalawe Reservoir Landscape", className: "col-span-1 row-span-1 aspect-square" },
  { id: 8, src: "/room-detail.webp", alt: "Guest Room Interior", className: "col-span-1 row-span-1 aspect-square" },
];

export function MasonryGallery() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const images = gsap.utils.toArray(".gallery-item");
    
    gsap.set(images, { opacity: 0, y: DISTANCE.medium });
    
    gsap.to(images, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
        once: true,
      },
      opacity: 1,
      y: 0,
      duration: DURATION.normal,
      ease: EASE.luxOut,
      stagger: 0.12,
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full">
      <div className="text-center mb-16 space-y-2">
        <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono">
          Wilderness Photography & Estate Gallery
        </span>
        <h3 className="text-4xl md:text-5xl font-serif text-white">
          Moments at Wildlily Safari Resort
        </h3>
        <p className="text-stone-400 text-sm max-w-xl mx-auto pt-2 font-light">
          Photorealistic captures of our sanctuary architecture, wild elephant herds, Sri Lankan leopards, and candlelit bush gastronomy.
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-min max-w-7xl mx-auto px-4 md:px-0">
        {galleryImages.map((image) => (
          <div
            key={image.id}
            className={`gallery-item relative rounded-2xl overflow-hidden border border-stone-800 shadow-xl group cursor-pointer ${image.className}`}
          >
            <Image 
              src={image.src} 
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-[2000ms] ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
              <span className="text-xs font-mono text-emerald-300 font-medium">
                {image.alt}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
