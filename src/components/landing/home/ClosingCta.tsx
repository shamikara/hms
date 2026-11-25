"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { AuthPhoto } from "@/features/auth/components/AuthPhoto";
import { HOME, type HomeDict } from "@/lib/i18n/home";

/**
 * Last word on the page: book, or ring.
 *
 * Scroll-expand: the pool scene starts as a rounded frame and grows to full
 * bleed as you scroll into it. The scene is the same "dynamic wallpaper" as
 * the sign-in page, so it follows the time of day at the resort (dawn, day,
 * golden hour, dusk, night). Progress goes to CSS variables once per frame,
 * so scrolling never re-renders React. With reduced motion it is simply
 * full size.
 */
export function ClosingCta({ contact, t = HOME.en.cta }: { contact: ContactValues; t?: HomeDict["cta"] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const frame = frameRef.current;
    if (!section || !frame) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const raw = travel > 0 ? -rect.top / travel : 1;
      const p = reduced ? 1 : Math.min(1, Math.max(0, raw));
      frame.style.setProperty("--p", (1 - Math.pow(1 - p, 3)).toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          window.addEventListener("scroll", onScroll, { passive: true });
          window.addEventListener("resize", onScroll);
          update();
        } else {
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
    <section ref={sectionRef} className="relative h-[190vh] bg-stone-950 motion-reduce:h-auto">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <div
          ref={frameRef}
          style={{ "--p": 0 } as React.CSSProperties}
          className="relative overflow-hidden bg-stone-900 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]
            w-[calc(88vw+12vw*var(--p))] h-[calc(64vh+36vh*var(--p))]
            sm:w-[calc(62vw+38vw*var(--p))] sm:h-[calc(56vh+44vh*var(--p))]
            rounded-[calc(28px*(1-var(--p)))]"
        >
          <div className="absolute inset-0 scale-[calc(1.12-0.12*var(--p))]">
            <AuthPhoto sizes="100vw" showGreeting={false} idleVideo={false} priority={false} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f2219]/90 via-[#0f2219]/60 to-[#0f2219]/10" />
          <div className="relative flex h-full items-center px-6 sm:px-12 lg:px-20">
            <div className="max-w-xl">
              <h2 className="font-serif text-3xl sm:text-5xl leading-tight text-white">{t.title}</h2>
              <p className="mt-4 sm:mt-5 text-base sm:text-lg text-stone-200">{t.text}</p>
              <div className="mt-7 sm:mt-9 flex flex-wrap gap-3">
                <Link
                  href="/book"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 sm:px-7 py-3 sm:py-3.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
                >
                  {t.button} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 sm:px-7 py-3 sm:py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  <Phone className="h-4 w-4" aria-hidden /> {contact.phoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
