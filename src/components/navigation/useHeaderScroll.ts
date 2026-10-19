"use client";

import { useEffect, useState } from "react";

/** Never retreat while the hero is still visible. */
const HIDE_BELOW = 260;
/** Ignore scroll jitter and rubber-banding. */
const DIRECTION_THRESHOLD = 8;
/**
 * Condense thresholds. The two values are deliberate hysteresis — a single
 * value flickers when the pointer rests on the boundary. Do not merge them.
 */
const CONDENSE_ON = 24;
const CONDENSE_OFF = 8;

interface HeaderScrollState {
  /** Retreating off the top edge (scrolling down, past the hero). */
  hidden: boolean;
  /** Past the condense threshold. */
  scrolled: boolean;
  /** Scrolled clear of the hero. */
  pastHero: boolean;
}

export function useHeaderScroll(): HeaderScrollState {
  const [state, setState] = useState<HeaderScrollState>({
    hidden: false,
    scrolled: false,
    pastHero: false,
  });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;

      setState((prev) => {
        // Hysteresis: once condensed, stay condensed until well clear of the top.
        const scrolled = prev.scrolled ? y > CONDENSE_OFF : y > CONDENSE_ON;
        const pastHero = y >= HIDE_BELOW;

        // Below the direction threshold this is jitter, so hold the last
        // direction and leave lastY untouched so small moves accumulate.
        if (Math.abs(delta) < DIRECTION_THRESHOLD) {
          return { hidden: prev.hidden && pastHero, scrolled, pastHero };
        }

        lastY = y;
        return { hidden: pastHero && delta > 0, scrolled, pastHero };
      });
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    // Seed from the current position so a mid-page reload renders correctly.
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return state;
}
