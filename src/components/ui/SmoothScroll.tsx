"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

// Register GSAP plugins globally
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis
      root
      options={{
        lerp: 0.08, // The lower the number, the smoother and heavier the scroll. 0.08 is a good balance for luxury.
        duration: 1.2,
        syncTouch: true,
      }}
    >
      {children}
    </ReactLenis>
  );
}
