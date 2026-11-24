"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

/**
 * A room's photos: swipe or use the arrows; tap to see them large.
 * Native scroll-snap does the sliding, so touch and trackpads feel right.
 */
export function RoomGallery({ photos, name, children }: { photos: string[]; name: string; children?: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const many = photos.length > 1;

  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const next = (i + photos.length) % photos.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  }, [photos.length]);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="relative h-full w-full group">
      <div
        ref={track}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-none"
        aria-label={`Photos of the ${name}`}
        role="region"
      >
        {photos.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpen(i)}
            className="relative h-full w-full shrink-0 snap-start cursor-zoom-in"
            aria-label={`Open photo ${i + 1} of ${photos.length} large`}
          >
            <Image
              src={src}
              alt={i === 0 ? name : `${name}, photo ${i + 1}`}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority={false}
            />
          </button>
        ))}
      </div>

      {children}

      {many && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-stone-950/60 text-white backdrop-blur-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-stone-950/60 text-white backdrop-blur-sm opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((src, i) => (
              <span key={src} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
          <span className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-1 rounded-full bg-stone-950/60 px-2.5 py-1 text-[11px] font-mono text-white/90">
            <Expand className="h-3 w-3" /> {index + 1}/{photos.length}
          </span>
        </>
      )}

      {/* Portalled: the card sits inside an animated (transformed) wrapper,
          which would otherwise trap a fixed overlay inside the card. */}
      {open !== null && createPortal(<Lightbox photos={photos} name={name} start={open} onClose={() => setOpen(null)} />, document.body)}
    </div>
  );
}

function Lightbox({ photos, name, start, onClose }: { photos: string[]; name: string; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const step = useCallback((d: number) => setI((v) => (v + d + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, step]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${name} photos`} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95" onClick={onClose}>
      <div className="relative h-[80vh] w-[92vw] max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <Image src={photos[i]} alt={`${name}, photo ${i + 1}`} fill sizes="92vw" className="object-contain" />
      </div>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      {photos.length > 1 && (
        <>
          <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous photo" className="absolute left-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next photo" className="absolute right-3 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
            <ChevronRight className="h-6 w-6" />
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-xs text-white/70">
            {i + 1} / {photos.length}
          </p>
        </>
      )}
    </div>
  );
}
