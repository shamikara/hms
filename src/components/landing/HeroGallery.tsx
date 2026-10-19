"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DISTANCE, DURATION, EASE } from "@/lib/motion/motionTokens";

export interface HeroSlide {
  src: string;
  alt: string;
}

const SLIDE_MS = 6000;

/**
 * Full-screen hero that crossfades through a set of photographs.
 * Keeps the cinematic reveal and scroll parallax of a single-image hero.
 */
export function HeroGallery({ slides, children }: { slides: HeroSlide[]; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // Advance the slide. Pauses while the tab is hidden so the crossfade is
  // never mid-flight when the user comes back.
  useEffect(() => {
    if (slides.length < 2) return;
    let timer: ReturnType<typeof setInterval>;

    const start = () => {
      timer = setInterval(() => setActive((i) => (i + 1) % slides.length), SLIDE_MS);
    };
    const onVisibility = () => {
      clearInterval(timer);
      if (!document.hidden) start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slides.length]);

  useGSAP(() => {
    const tl = gsap.timeline();

    gsap.set(layerRef.current, { scale: 1.15 });
    gsap.set(contentRef.current, { opacity: 0, y: DISTANCE.small });
    gsap.set(overlayRef.current, { opacity: 1 });

    tl.to(layerRef.current, { scale: 1, duration: DURATION.verySlow, ease: EASE.luxOut }, 0)
      .to(overlayRef.current, { opacity: 0, duration: DURATION.slow, ease: EASE.luxOut }, 0)
      .to(contentRef.current, { opacity: 1, y: 0, duration: DURATION.normal, ease: EASE.luxOut }, 0.5);

    gsap.to(layerRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: "20%",
      ease: "none",
    });
  }, { scope: containerRef });

  return (
    <div
      ref={containerRef}
      className="relative h-screen flex items-center justify-center bg-stone-900 overflow-hidden w-full"
    >
      <div ref={layerRef} className="absolute inset-0">
        {slides.map((slide, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            aria-hidden={i !== active}
            className="absolute w-full h-full object-cover transition-opacity duration-[1600ms] ease-in-out motion-reduce:transition-none"
            style={{ opacity: i === active ? 0.8 : 0 }}
          />
        ))}
      </div>

      {/* Starting overlay that fades out to reveal the first photograph */}
      <div ref={overlayRef} className="absolute inset-0 bg-stone-950 z-10" />

      {/* Permanent gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-stone-950 z-10" />

      <div ref={contentRef} className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
        {children}
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2.5">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => setActive(i)}
            aria-label={`Show photograph ${i + 1}: ${slide.alt}`}
            aria-current={i === active}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === active ? "w-8 bg-emerald-400" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
