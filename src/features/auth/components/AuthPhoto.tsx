"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * A "dynamic wallpaper" for the sign-in page, in the spirit of macOS: the
 * pool scene drifts through the day at the resort's own time — pink at dawn,
 * clear by day, warm at golden hour, blue at dusk — and then dissolves into
 * the real night photo once the lights are on.
 *
 * The look at any minute is interpolated between the keyframes below, so it
 * changes gradually rather than jumping. Sunrise and sunset in Udawalawe move
 * by only ~30 minutes across the year (it is 6°N), so fixed times are fine.
 */

interface Look {
  /** Night photo on top of the day photo, 0–1. */
  night: number;
  /** Warm orange grade (golden hour), 0–1. */
  warm: number;
  /** Pink-violet grade (dawn), 0–1. */
  pink: number;
  /** Deep blue grade (dusk, blue hour), 0–1. */
  blue: number;
  /** Plain darkening, 0–1. */
  dark: number;
}

const KEYFRAMES: [number, Look][] = [
  [0 * 60, { night: 1, warm: 0, pink: 0, blue: 0.1, dark: 0.15 }],
  [5 * 60 + 15, { night: 1, warm: 0, pink: 0, blue: 0.2, dark: 0.2 }],
  // The two photos are taken from different spots, so they swap quickly
  // while the scene is dim instead of showing through each other.
  [5 * 60 + 35, { night: 1, warm: 0, pink: 0.1, blue: 0.3, dark: 0.55 }],
  [5 * 60 + 50, { night: 0, warm: 0.1, pink: 0.35, blue: 0.35, dark: 0.45 }],
  [6 * 60 + 30, { night: 0, warm: 0.35, pink: 0.65, blue: 0, dark: 0.05 }],
  [8 * 60, { night: 0, warm: 0, pink: 0, blue: 0, dark: 0 }],
  [15 * 60 + 30, { night: 0, warm: 0, pink: 0, blue: 0, dark: 0 }],
  [17 * 60, { night: 0, warm: 0.8, pink: 0.15, blue: 0, dark: 0.05 }],
  [17 * 60 + 50, { night: 0, warm: 0.6, pink: 0.55, blue: 0.15, dark: 0.12 }],
  [18 * 60 + 25, { night: 0, warm: 0.1, pink: 0.2, blue: 0.55, dark: 0.45 }],
  [18 * 60 + 40, { night: 1, warm: 0, pink: 0, blue: 0.45, dark: 0.45 }],
  [19 * 60 + 15, { night: 1, warm: 0, pink: 0, blue: 0.15, dark: 0.1 }],
  [24 * 60, { night: 1, warm: 0, pink: 0, blue: 0.1, dark: 0.15 }],
];

function lookAt(minute: number): Look {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const [t0, a] = KEYFRAMES[i];
    const [t1, b] = KEYFRAMES[i + 1];
    if (minute >= t0 && minute <= t1) {
      const k = t1 === t0 ? 0 : (minute - t0) / (t1 - t0);
      // Ease in-out so changes start and finish softly.
      const e = k * k * (3 - 2 * k);
      const mix = (x: number, y: number) => x + (y - x) * e;
      return { night: mix(a.night, b.night), warm: mix(a.warm, b.warm), pink: mix(a.pink, b.pink), blue: mix(a.blue, b.blue), dark: mix(a.dark, b.dark) };
    }
  }
  return KEYFRAMES[0][1];
}

/** Minutes past midnight in Sri Lanka, whatever the visitor's own time zone. */
function colomboMinute(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "numeric", hour12: false, timeZone: "Asia/Colombo" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function greeting(minute: number): string {
  const h = minute / 60;
  if (h >= 5 && h < 6.5) return "Sunrise in Udawalawe 🌅";
  if (h >= 6.5 && h < 12) return "Good morning from Udawalawe ☀️";
  if (h >= 12 && h < 17) return "Good afternoon from Udawalawe ☀️";
  if (h >= 17 && h < 18.6) return "Golden hour in Udawalawe 🌇";
  if (h >= 18.6 && h < 22) return "Good evening from Udawalawe 🌙";
  return "A quiet night in Udawalawe 🌙";
}

export function AuthPhoto() {
  const [minute, setMinute] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setMinute(colomboMinute());
    update();
    const t = window.setInterval(update, 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  // Before the clock is read (first paint), show the plain day scene.
  const look = minute === null ? lookAt(12 * 60) : lookAt(minute);
  const fade = "transition-opacity duration-[2500ms] ease-in-out";

  return (
    <>
      <Image
        src="/hero/hero-pool-pergola.webp"
        alt=""
        fill
        priority
        sizes="(max-width: 1024px) 100vw, 50vw"
        className="object-cover object-[40%_75%]"
      />
      {/* Colour grades: blended over the photo like a sky changing colour. */}
      <div className={`absolute inset-0 bg-[#ff8a3d] mix-blend-soft-light ${fade}`} style={{ opacity: look.warm }} />
      <div className={`absolute inset-0 bg-gradient-to-b from-[#ff7a2f] via-[#ffb35c]/60 to-transparent mix-blend-multiply ${fade}`} style={{ opacity: look.warm * 0.45 }} />
      <div className={`absolute inset-0 bg-gradient-to-b from-[#ff9ec4] via-[#ffc7a1] to-transparent mix-blend-soft-light ${fade}`} style={{ opacity: look.pink }} />
      <div className={`absolute inset-0 bg-[#1b3a8a] mix-blend-multiply ${fade}`} style={{ opacity: look.blue }} />
      <Image
        src="/hero/hero-pool-night.webp"
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        className={`object-cover object-[50%_60%] ${fade}`}
        style={{ opacity: look.night }}
      />
      <div className={`absolute inset-0 bg-black ${fade}`} style={{ opacity: look.dark }} />
      <p
        aria-hidden={minute === null}
        className={`absolute top-5 left-6 lg:top-8 lg:left-10 z-10 text-xs lg:text-sm text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] transition-opacity duration-700 ${minute === null ? "opacity-0" : "opacity-100"}`}
      >
        {minute === null ? " " : greeting(minute)}
      </p>
    </>
  );
}
