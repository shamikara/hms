"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/motion/gsap";
import { DISTANCE, DURATION, EASE } from "@/lib/motion/motionTokens";

export type HeroTransition = "fade" | "wipe" | "iris" | "split" | "push" | "zoom";

export interface HeroSlide {
  src: string;
  alt: string;
  /** How this photo arrives. Defaults to a crossfade. */
  transition?: HeroTransition;
  /** Where the slow zoom heads, as a CSS transform-origin. */
  focus?: string;
}

const SLIDE_MS = 6500;

/**
 * Full-screen hero that moves through a set of photographs, each arriving
 * with its own transition (wipe, circle reveal, push, split, zoom) and then
 * slowly zooming while it is on screen.
 *
 * Only the photo on screen and the next one are in the page; the rest load
 * just before they are needed, so the first visit stays light.
 */
export function HeroGallery({ slides, children }: { slides: HeroSlide[]; children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const [mounted, setMounted] = useState(() => new Set([0, 1 % slides.length]));

  const activeRef = useRef(0);

  const go = (next: number) => {
    const current = activeRef.current;
    if (next === current) return;
    activeRef.current = next;
    setPrevious(current);
    setActive(next);
    setMounted((m) => new Set(m).add(next).add((next + 1) % slides.length));
  };

  // Advance on a timer; paused while the tab is hidden so a transition is
  // never half-finished when the visitor comes back. Choosing a photo with
  // the dots restarts the timer, so it gets its full time on screen.
  const [timerKey, setTimerKey] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    let timer: ReturnType<typeof setInterval>;
    const start = () => {
      timer = setInterval(() => go((activeRef.current + 1) % slides.length), SLIDE_MS);
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
    // go only touches refs and setters, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length, timerKey]);

  useGSAP(
    () => {
      const tl = gsap.timeline();
      gsap.set(layerRef.current, { scale: 1.08 });
      gsap.set(contentRef.current, { opacity: 0, y: DISTANCE.small });
      gsap.set(overlayRef.current, { opacity: 1 });
      tl.to(layerRef.current, { scale: 1, duration: DURATION.verySlow, ease: EASE.luxOut }, 0)
        .to(overlayRef.current, { opacity: 0, duration: DURATION.slow, ease: EASE.luxOut }, 0)
        .to(contentRef.current, { opacity: 1, y: 0, duration: DURATION.normal, ease: EASE.luxOut }, 0.5);
      gsap.to(layerRef.current, {
        scrollTrigger: { trigger: containerRef.current, start: "top top", end: "bottom top", scrub: true },
        y: "20%",
        ease: "none",
      });
    },
    { scope: containerRef },
  );

  return (
    <div
      ref={containerRef}
      className="relative h-screen flex items-center justify-center bg-stone-900 overflow-hidden w-full"
    >
      <div ref={layerRef} className="absolute inset-0">
        {slides.map((slide, i) => {
          if (!mounted.has(i)) return null;
          const isActive = i === active;
          const isPrevious = i === previous;
          const kind = slide.transition ?? "fade";
          // The arriving photo sits on top and animates in; the one it
          // replaces stays visible underneath until it is covered.
          const layer = isActive
            ? `z-[2] ${previous === null ? "" : `hero-enter-${kind}`}`
            : isPrevious
              ? `z-[1] ${slides[active]?.transition === "push" ? "hero-exit-push" : ""}`
              : "z-0 opacity-0";
          return (
            <div key={`${slide.src}-${isActive ? `on-${active}` : "off"}`} className={`absolute inset-0 overflow-hidden ${layer}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={slide.alt}
                aria-hidden={!isActive}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className={`w-full h-full object-cover ${isActive || isPrevious ? "hero-kenburns" : ""}`}
                style={{ transformOrigin: slide.focus ?? "50% 50%" }}
              />
            </div>
          );
        })}
      </div>

      {/* Starting overlay that fades out to reveal the first photograph */}
      <div ref={overlayRef} className="absolute inset-0 bg-stone-950 z-10" />

      {/* Permanent gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/60 z-10" />

      <div ref={contentRef} className="relative z-20 text-center px-4 max-w-5xl w-full mx-auto mt-16">
        {children}
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2.5">
        {slides.map((slide, i) => (
          <button
            key={slide.src}
            onClick={() => {
              go(i);
              setTimerKey((k) => k + 1);
            }}
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
