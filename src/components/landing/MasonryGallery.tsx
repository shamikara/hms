"use client";

import Image from "next/image";
import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DISTANCE, DURATION, EASE } from "@/lib/motion/motionTokens";

const galleryImages = [
  { id: 1, src: "/experiences-udawalawe.png", alt: "Elephants in Udawalawe", className: "col-span-2 row-span-2 aspect-square" },
  { id: 2, src: "/safari-leopard.png", alt: "Sri Lankan Leopard", className: "col-span-1 row-span-1 aspect-square" },
  { id: 3, src: "/safari-dining.png", alt: "Outdoor Dining", className: "col-span-1 row-span-1 aspect-square" },
  { id: 4, src: "/hero-bg-udawalawe.png", alt: "Resort Lodge", className: "col-span-2 row-span-1 aspect-[2/1]" },
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
      stagger: 0.15,
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full">
      <div className="text-center mb-16">
        <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-4 block">Gallery</span>
        <h3 className="text-4xl md:text-5xl font-serif text-white">Moments at Udawalawe</h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-min max-w-7xl mx-auto px-4 md:px-0">
        {galleryImages.map((image) => (
          <div
            key={image.id}
            className={`gallery-item relative rounded-sm overflow-hidden group cursor-pointer ${image.className}`}
          >
            <Image 
              src={image.src} 
              alt={image.alt}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-[2000ms] ease-out"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
          </div>
        ))}
      </div>
    </div>
  );
}
