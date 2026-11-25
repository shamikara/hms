"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { HOME, type HomeDict } from "@/lib/i18n/home";

const FILES = [
  { src: "/tour/tour-courtyard-pool.mp4", poster: "/tour/tour-courtyard-pool.webp" },
  { src: "/tour/tour-verandah-view.mp4", poster: "/tour/tour-verandah-view.webp" },
  { src: "/tour/tour-garden-rooms.mp4", poster: "/tour/tour-garden-rooms.webp" },
];

type Clip = { src: string; poster: string; title: string; note: string };

/**
 * Three short phone clips of the grounds. Each plays muted on a loop only
 * while on screen (and never downloads until it is near), and only when the
 * visitor has not asked for reduced motion. Tapping a card opens it large.
 */
export function WalkAround({ t = HOME.en.walk }: { t?: HomeDict["walk"] }) {
  const [open, setOpen] = useState<number | null>(null);
  const CLIPS: Clip[] = FILES.map((f, i) => ({ ...f, ...t.clips[i] }));

  return (
    <section className="bg-stone-950 py-20 sm:py-24 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <SectionHeading eyebrow={t.eyebrow} title={t.title}>
          <p className="text-stone-300">{t.intro}</p>
        </SectionHeading>

        <ul className="mt-10 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none sm:grid sm:grid-cols-3 sm:overflow-visible sm:gap-6">
          {CLIPS.map((clip, i) => (
            <li key={clip.src} className="w-[80vw] shrink-0 snap-start sm:w-auto">
              <ClipCard clip={clip} playLabel={t.play} onOpen={() => setOpen(i)} />
            </li>
          ))}
        </ul>
      </div>

      {open !== null && <ClipViewer clip={CLIPS[open]} closeLabel={t.close} onClose={() => setOpen(null)} />}
    </section>
  );
}

function ClipCard({ clip, playLabel, onOpen }: { clip: Clip; playLabel: string; onOpen: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (video.preload !== "auto") video.preload = "auto";
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full text-left focus-visible:outline-none"
      aria-label={`${playLabel}: ${clip.title}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-stone-900 ring-1 ring-white/10 group-focus-visible:ring-2 group-focus-visible:ring-emerald-400">
        <video
          ref={ref}
          src={clip.src}
          poster={clip.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition group-hover:bg-white/30">
          <Play className="h-4 w-4 fill-current" aria-hidden />
        </span>
        <div className="absolute bottom-4 left-5 right-5 text-white">
          <p className="font-serif text-xl">{clip.title}</p>
          <p className="text-sm text-white/75">{clip.note}</p>
        </div>
      </div>
    </button>
  );
}

function ClipViewer({ clip, closeLabel, onClose }: { clip: Clip; closeLabel: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={clip.title}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label={closeLabel}
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <video
        src={clip.src}
        poster={clip.poster}
        controls
        autoPlay
        muted
        loop
        playsInline
        className="max-h-[85vh] w-full max-w-4xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
