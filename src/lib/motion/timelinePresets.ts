import gsap from "gsap";
import { DURATION, EASE, DISTANCE } from "./motionTokens";

/**
 * Common timeline presets for the application.
 */
export const timelinePresets = {
  /**
   * Creates a timeline for revealing sections as they scroll into view.
   */
  sectionReveal: (element: Element | string) => {
    return gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: "top 85%", // Trigger when the top of the element is 85% down the viewport
        once: true, // Only animate once
      },
    });
  },

  /**
   * Standard fade up animation config to be added to a timeline
   */
  fadeUpConfig: () => ({
    y: DISTANCE.medium,
    opacity: 0,
    duration: DURATION.normal,
    ease: EASE.luxOut,
    stagger: 0.15,
  }),
};
