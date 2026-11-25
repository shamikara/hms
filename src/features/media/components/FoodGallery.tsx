"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

export interface FoodGalleryPhoto {
  src: string;
  alt: string;
  caption: string;
  width: number;
  height: number;
}

/**
 * Bento layout, repeating every seven photos so the grid packs with no gaps:
 *
 *   desktop (3 columns)        phone (2 columns)
 *   ┌────┬────┬────┐           ┌────┬────┐
 *   │ T  │ 1  │ 2  │           │ T  │ 1  │
 *   │    ├────┴────┤           │    ├────┤
 *   │    │  wide   │           │    │ 2  │
 *   ├────┴────┬────┤           ├────┴────┤ wide
 *   │  wide   │ 5  │           ├─────────┤ wide
 *   ├─────────┴────┤           ├─────────┤ 5 (wide on phones)
 *   │    full      │           ├─────────┤ full
 *   └──────────────┘           └─────────┘
 * Leftover photos (fewer than seven) use the TAIL layouts below.
 */
type Slot = "tall" | "normal" | "wide" | "full";
interface Cell {
  slot: Slot;
  /** Grid classes for 2 columns (phones) and 3 columns (lg). */
  cls: string;
}
const C = {
  tall: { slot: "tall", cls: "row-span-2" },
  normal: { slot: "normal", cls: "" },
  wide: { slot: "wide", cls: "col-span-2" },
  full: { slot: "full", cls: "col-span-2 lg:col-span-3" },
  // Normal on desktop, full row on phones (fills the gap a 2-column grid leaves).
  normalWideOnPhone: { slot: "normal", cls: "col-span-2 lg:col-span-1" },
  // Wide on desktop, normal on phones.
  wideOnDesktop: { slot: "wide", cls: "lg:col-span-2" },
} satisfies Record<string, Cell>;

/** Seven cells that pack exactly on both 2 and 3 columns (see diagram above). */
const CYCLE: Cell[] = [
  C.tall,
  C.normal,
  C.normal,
  C.wide,
  C.wide,
  C.normalWideOnPhone,
  C.full,
];
/** Layouts for 1–6 photos left over after full cycles, also gap-free. */
const TAIL: Cell[][] = [
  [],
  [C.full],
  [C.wideOnDesktop, C.normal],
  [C.normal, C.normal, C.normalWideOnPhone],
  [C.tall, C.normal, C.normal, C.wide],
  [C.tall, C.normal, C.normal, C.wide, C.full],
  [C.tall, C.normal, C.normal, C.wide, C.wide, C.normalWideOnPhone],
];

/** Lay out the cells, then put portrait photos in tall cells and landscape ones in wide cells. */
function arrange(
  photos: FoodGalleryPhoto[],
): { photo: FoodGalleryPhoto; cell: Cell; index: number }[] {
  const full = Math.floor(photos.length / CYCLE.length);
  const cells: Cell[] = [
    ...Array.from({ length: full }, () => CYCLE).flat(),
    ...TAIL[photos.length % CYCLE.length],
  ];
  const portrait = photos.filter((p) => p.height > p.width * 1.05);
  const landscape = photos.filter((p) => p.width > p.height * 1.05);
  const square = photos.filter(
    (p) => !portrait.includes(p) && !landscape.includes(p),
  );
  const take = (order: FoodGalleryPhoto[][]) => {
    for (const list of order) if (list.length) return list.shift()!;
    return null;
  };
  return cells.map((cell, index) => {
    const photo =
      cell.slot === "tall"
        ? take([portrait, square, landscape])
        : cell.slot === "normal"
          ? take([square, portrait, landscape])
          : take([landscape, square, portrait]);
    return { photo: photo!, cell, index };
  });
}

export function FoodGallery({ photos }: { photos: FoodGalleryPhoto[] }) {
  const items = useMemo(() => arrange(photos), [photos]);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-3 grid-flow-dense auto-rows-[170px] sm:auto-rows-[220px] lg:auto-rows-[250px] gap-3 sm:gap-5">
        {items.map(({ photo, cell, index }) => {
          const slot = cell.slot;
          return (
            <button
              key={photo.src}
              type="button"
              onClick={() => setOpen(index)}
              aria-label={`Open photo: ${photo.caption || photo.alt}`}
              className={`group relative overflow-hidden rounded-[22px] sm:rounded-[28px] bg-stone-900 text-left shadow-lg ring-1 ring-white/5 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${cell.cls}`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={
                  slot === "full"
                    ? "(max-width: 1024px) 100vw, 1100px"
                    : slot === "wide"
                      ? "(max-width: 1024px) 100vw, 740px"
                      : "(max-width: 1024px) 50vw, 370px"
                }
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
              />
              {/* Readability gradient, then a warm tint that comes in on hover. */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-amber-900/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

              <span className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 font-mono text-[10px] sm:text-[11px] text-white/85 backdrop-blur-md">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="absolute top-3 right-3 sm:top-4 sm:right-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/30 text-white/85 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
                <Expand className="h-3.5 w-3.5" aria-hidden />
              </span>

              {photo.caption && (
                <span className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <span
                    className={`block font-serif text-white leading-tight ${
                      slot === "full" || slot === "wide"
                        ? "text-lg sm:text-2xl"
                        : "text-base sm:text-xl"
                    }`}
                  >
                    {photo.caption}
                  </span>
                  <span className="mt-3 hidden items-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 sm:flex translate-y-2 group-hover:translate-y-0">
                    <span className="h-px flex-1 bg-white/30" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/75">
                      View
                    </span>
                    <span className="h-px flex-1 bg-white/30" />
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {open !== null &&
        createPortal(
          <Lightbox
            items={items.map((i) => i.photo)}
            start={open}
            onClose={() => setOpen(null)}
          />,
          document.body,
        )}
    </>
  );
}

function Lightbox({
  items,
  start,
  onClose,
}: {
  items: FoodGalleryPhoto[];
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touch = useRef<number | null>(null);
  const step = useCallback(
    (d: number) => setI((v) => (v + d + items.length) % items.length),
    [items.length],
  );
  const photo = items[i];

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Food photos"
      className="fixed inset-0 z-[100] flex flex-col bg-black/[0.97] backdrop-blur-md"
      onClick={onClose}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="font-mono text-xs text-white/60">
          {i + 1} / {items.length}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="100vw"
          className="object-contain animate-in fade-in duration-300"
        />
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2 sm:left-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2 sm:right-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      <div
        className="px-6 py-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.caption && (
          <p className="font-serif text-xl text-white">{photo.caption}</p>
        )}
        {/* Thumbnails to jump straight to a dish. */}
        <div className="mx-auto mt-4 flex max-w-full justify-center gap-2 overflow-x-auto">
          {items.map((p, j) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setI(j)}
              aria-label={`Show photo ${j + 1}`}
              className={`relative h-12 w-16 shrink-0 overflow-hidden rounded-lg transition-opacity ${j === i ? "ring-2 ring-emerald-400 opacity-100" : "opacity-50 hover:opacity-90"}`}
            >
              <Image
                src={p.src}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
