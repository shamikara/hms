"use client";

import { useEffect, useRef } from "react";
import { HOME, type HomeDict } from "@/lib/i18n/home";

/**
 * Scroll-expand moment: the night-pool loop starts as a rounded frame in the
 * middle of the screen and grows to full bleed as you scroll, then a line of
 * text settles over it. The section is taller than the screen and the frame
 * is sticky, so the growth is tied to scroll position, not a timer.
 *
 * Progress is written to CSS variables on one element per animation frame,
 * so React never re-renders while scrolling. With reduced motion the frame
 * is simply full-size. The video only loads and plays while near the screen.
 */
export function NightExpand({ t = HOME.en.night }: { t?: HomeDict["night"] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!section || !frame || !video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? -rect.top / travel : 1;
      const p = reduced ? 1 : Math.min(1, Math.max(0, raw));
      // Ease out so most of the growth happens early in the scroll.
      const e = 1 - Math.pow(1 - p, 3);
      frame.style.setProperty("--p", e.toFixed(4));
      frame.style.setProperty("--text", Math.min(1, Math.max(0, (p - 0.55) / 0.3)).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.preload !== "auto") video.preload = "auto";
          if (!reduced) video.play().catch(() => {});
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
          update();
        } else {
          video.pause();
          window.removeEventListener("scroll", onScroll);
          window.removeEventListener("resize", onScroll);
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={sectionRef} aria-label={t.label} className="relative h-[220vh] bg-stone-950 motion-reduce:h-screen">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          ref={frameRef}
          style={{ "--p": 0, "--text": 0 } as React.CSSProperties}
          className="relative overflow-hidden bg-stone-900 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]
            w-[calc(78vw+22vw*var(--p))] h-[calc(46vh+54vh*var(--p))]
            sm:w-[calc(58vw+42vw*var(--p))] sm:h-[calc(52vh+48vh*var(--p))]
            rounded-[calc(28px*(1-var(--p)))]"
        >
          <video
            ref={videoRef}
            src="/tour/pool-night-loop.mp4"
            poster="/tour/pool-night-loop.webp"
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover scale-[calc(1.15-0.15*var(--p))]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20 opacity-[calc(0.4+0.6*var(--text))]" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-28 sm:pb-20 text-center opacity-[var(--text)] translate-y-[calc(24px*(1-var(--text)))]">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">{t.eyebrow}</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-serif text-3xl sm:text-5xl md:text-6xl leading-tight text-white">
              {t.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-lg text-white/85">{t.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
