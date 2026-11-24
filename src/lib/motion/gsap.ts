"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

/**
 * The one place GSAP plugins are registered.
 *
 * Every component that animates on scroll must import gsap from here.
 * Without registration GSAP ignores the scroll-trigger option and simply plays
 * the tween on load, which is how the hero parallax used to push the
 * photograph 20% down the screen, leaving a black band above it, and why
 * "reveal on scroll" sections all appeared at once.
 */
gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };
