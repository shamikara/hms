"use client";

import { useRef, ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { timelinePresets } from "@/lib/motion/timelinePresets";
import { DISTANCE, DURATION, EASE } from "@/lib/motion/motionTokens";

interface ScrollRevealProps {
  children: ReactNode;
  width?: "w-full" | "w-auto";
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export function ScrollReveal({ 
  children, 
  width = "w-full", 
  delay = 0,
  direction = "up",
  className = ""
}: ScrollRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!contentRef.current) return;

    let x = 0, y = 0;
    switch (direction) {
      case "up": y = DISTANCE.medium; break;
      case "down": y = -DISTANCE.medium; break;
      case "left": x = DISTANCE.medium; break;
      case "right": x = -DISTANCE.medium; break;
    }

    // Set initial state
    gsap.set(contentRef.current, { opacity: 0, x, y, filter: "blur(10px)" });

    // Create ScrollTrigger animation
    gsap.to(contentRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 85%",
        once: true,
      },
      opacity: 1,
      x: 0,
      y: 0,
      filter: "blur(0px)",
      duration: DURATION.normal,
      delay: delay,
      ease: EASE.luxOut,
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className={`${width} ${className} overflow-hidden`}>
      <div ref={contentRef} className="w-full h-full">
        {children}
      </div>
    </div>
  );
}

export function ParallaxHero({ children, imageSrc, alt }: { children: ReactNode, imageSrc: string, alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  useGSAP(() => {
    // Cinematic Hero Reveal
    const tl = gsap.timeline();

    gsap.set(imgRef.current, { scale: 1.15 });
    gsap.set(contentRef.current, { opacity: 0, y: DISTANCE.small });
    gsap.set(overlayRef.current, { opacity: 1 });

    tl.to(imgRef.current, {
      scale: 1,
      duration: DURATION.verySlow,
      ease: EASE.luxOut,
    }, 0)
    .to(overlayRef.current, {
      opacity: 0,
      duration: DURATION.slow,
      ease: EASE.luxOut,
    }, 0)
    .to(contentRef.current, {
      opacity: 1,
      y: 0,
      duration: DURATION.normal,
      ease: EASE.luxOut,
    }, 0.5);

    // Subtle scroll parallax
    gsap.to(imgRef.current, {
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
      y: "20%",
      ease: "none",
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="relative h-screen flex items-center justify-center bg-stone-900 overflow-hidden w-full">
      <img 
        ref={imgRef}
        src={imageSrc} 
        alt={alt}
        className="absolute w-full h-full object-cover opacity-80"
      />
      {/* Starting overlay that fades out to reveal the image */}
      <div ref={overlayRef} className="absolute inset-0 bg-stone-950 z-10" />
      
      {/* Permanent gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-stone-950 z-10" />
      
      <div ref={contentRef} className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20">
        {children}
      </div>
    </div>
  );
}
