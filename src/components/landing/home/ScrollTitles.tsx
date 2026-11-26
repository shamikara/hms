"use client";

import { useEffect, useRef } from "react";

/**
 * A divider of huge outlined words that drifts sideways as the page scrolls
 * (scroll position, not a timer, so it moves only when the visitor does).
 * Decorative: hidden from screen readers, still with reduced motion.
 */
export function ScrollTitles({ words, reverse = false, tone = "dark" }: { words: string[]; reverse?: boolean; tone?: "dark" | "forest" | "stone" }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = wrap.getBoundingClientRect();
      // 0 when the divider enters at the bottom, 1 when it leaves at the top.
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height);
      const shift = (Math.min(1, Math.max(0, p)) - 0.5) * 30; // percent of track width / 3
      track.style.transform = `translate3d(${reverse ? shift - 33.333 : -shift - 33.333}%, 0, 0)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        window.addEventListener("scroll", onScroll, { passive: true });
        update();
      } else window.removeEventListener("scroll", onScroll);
    });
    io.observe(wrap);
    update();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [reverse]);

  const run = (
    <>
      {words.map((w) => (
        <span key={w} className="inline-flex items-center">
          <span className="px-6 sm:px-10">{w}</span>
          <span className="text-emerald-400/70 [-webkit-text-stroke:0] text-[0.5em]">✱</span>
        </span>
      ))}
    </>
  );

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={`overflow-hidden select-none py-8 sm:py-12 ${tone === "forest" ? "bg-[#13291f]" : tone === "stone" ? "bg-stone-900" : "bg-stone-950"}`}
    >
      <div
        ref={trackRef}
        className="flex w-max whitespace-nowrap font-serif text-[16vw] sm:text-[11vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(231,229,228,0.55)] will-change-transform"
        style={{ transform: "translate3d(-33.333%,0,0)" }}
      >
        <div className="flex">{run}</div>
        <div className="flex">{run}</div>
        <div className="flex">{run}</div>
      </div>
    </div>
  );
}
