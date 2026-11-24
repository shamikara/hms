import Image from "next/image";
import { SectionHeading } from "./SectionHeading";

const PHOTOS = [
  { src: "/pool-garden-day.webp", alt: "The pool in the garden by day", wide: true },
  { src: "/wildlife-peacock.webp", alt: "A peacock displaying" },
  { src: "/safari-elephant-calf-grass.webp", alt: "An elephant and calf in the park" },
  { src: "/garden-night-steps.webp", alt: "The garden and steps lit at night" },
  { src: "/room-pink-double.webp", alt: "A double room with a pink bedspread", wide: true },
  { src: "/safari-breakfast-park.webp", alt: "Breakfast laid out during a safari" },
  { src: "/pool-from-above.webp", alt: "The pool seen from above" },
  { src: "/wildlife-green-pigeon.webp", alt: "A green pigeon in a tree" },
];

/**
 * An endless row of photographs drifting slowly sideways. The list is drawn
 * twice so the loop has no visible seam; hovering (or tabbing in) pauses it.
 * With reduced motion it becomes a still row you can scroll by hand.
 */
export function PhotoStrip() {
  const row = (copy: boolean) => (
    <div className={`flex shrink-0 ${copy ? "marquee-copy" : ""}`} aria-hidden={copy || undefined}>
      {PHOTOS.map((p) => (
        <figure
          key={p.src}
          className={`relative mr-4 h-[260px] sm:h-[380px] shrink-0 overflow-hidden rounded-3xl ${
            p.wide ? "w-[78vw] sm:w-[560px]" : "w-[62vw] sm:w-[285px]"
          }`}
        >
          <Image src={p.src} alt={copy ? "" : p.alt} fill sizes="(max-width: 640px) 78vw, 560px" className="object-cover" />
        </figure>
      ))}
    </div>
  );

  return (
    <section className="bg-stone-950 py-20 sm:py-24">
      <div className="px-5 sm:px-8 lg:px-16 mb-10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow="Around the house" title="The garden, the park, the birds" />
        </div>
      </div>
      <div className="marquee marquee-fade overflow-hidden scrollbar-none" aria-label="Photographs of the guesthouse and the park" role="region">
        <div className="marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
