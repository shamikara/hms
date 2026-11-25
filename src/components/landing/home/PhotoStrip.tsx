"use client";

import { useState } from "react";
import Image from "next/image";
import { SectionHeading } from "./SectionHeading";
import { DEFAULT_GALLERY_PHOTOS } from "@/features/media/lib/builtin";
import { HOME, type HomeDict } from "@/lib/i18n/home";

export interface StripPhoto {
  src: string;
  alt: string;
  wide: boolean;
}

/** More panels than this get too thin to read; Admin > Photos says so too. */
export const ACCORDION_MAX = 7;

/**
 * "Around the house" as an accordion: a row of slim photo panels where the one
 * you hover, focus or tap opens wide and shows its caption. On phones the row
 * becomes a stack that opens by height. The photo inside eases from a slight
 * zoom as its panel opens, which gives the reveal a little depth.
 *
 * Captions are the photo descriptions set in Admin > Photos.
 */
export function PhotoStrip({
  photos = DEFAULT_GALLERY_PHOTOS,
  t = HOME.en.photos,
}: {
  photos?: StripPhoto[];
  t?: HomeDict["photos"];
}) {
  const items = photos.slice(0, ACCORDION_MAX);
  const [active, setActive] = useState(0);

  if (items.length === 0) return null;

  return (
    <section className="bg-stone-950 py-20 sm:py-24 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} />

        <ul
          aria-label={t.label}
          className="mt-10 flex flex-col md:flex-row gap-2 sm:gap-3 h-[600px] sm:h-[640px] md:h-[520px]"
        >
          {items.map((photo, i) => {
            const open = i === active;
            return (
              <li
                key={`${photo.src}-${i}`}
                className={`relative min-h-0 min-w-0 transition-[flex-grow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  open ? "grow-[7]" : "grow"
                } basis-0`}
              >
                <button
                  type="button"
                  aria-expanded={open}
                  aria-label={photo.alt || `Photo ${i + 1}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                  className="group absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl bg-stone-900 ring-1 ring-white/10 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Image
                    src={photo.src}
                    alt=""
                    fill
                    sizes="(max-width: 768px) 100vw, 70vw"
                    className={`object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      open ? "scale-100" : "scale-[1.18]"
                    }`}
                  />
                  <span
                    className={`absolute inset-0 transition-colors duration-700 ${
                      open ? "bg-gradient-to-t from-black/70 via-black/0 to-black/0" : "bg-black/35 group-hover:bg-black/20"
                    }`}
                  />
                  <span
                    className={`absolute font-mono text-[11px] tracking-widest text-white/80 transition-opacity duration-500 ${
                      open ? "opacity-0" : "opacity-100"
                    } left-4 top-1/2 -translate-y-1/2 md:left-1/2 md:top-auto md:bottom-5 md:-translate-x-1/2 md:translate-y-0`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {photo.alt && (
                    <span
                      className={`absolute bottom-0 left-0 right-0 p-5 sm:p-7 transition-all duration-700 ${
                        open ? "translate-y-0 opacity-100 delay-200" : "translate-y-3 opacity-0"
                      }`}
                    >
                      <span className="block font-mono text-[11px] tracking-widest text-emerald-300">
                        {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
                      </span>
                      <span className="mt-1.5 block max-w-xl font-serif text-xl sm:text-2xl leading-snug text-white">
                        {photo.alt}
                      </span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
