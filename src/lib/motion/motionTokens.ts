/**
 * Standardized easing curves and durations for the cinematic motion system.
 * These tokens ensure a consistent "calm, luxurious, and elegant" feel across the app.
 */
export const EASE = {
  // Smooth, elegant entrance (similar to power3.out but softer)
  luxOut: "power2.out",
  // Slow, cinematic drift
  luxInOut: "power2.inOut",
  // Very subtle easing for continuous motions like parallax
  gentle: "sine.inOut",
};

export const DURATION = {
  fast: 0.6,
  normal: 1.2,
  slow: 2.0,
  verySlow: 4.0,
};

export const DISTANCE = {
  small: 20,
  medium: 50,
  large: 100,
};
