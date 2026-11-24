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
 * A scrollable row of photographs. Native horizontal scroll with snap: works
 * with touch, trackpad and keyboard without any script.
 */
export function PhotoStrip() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="px-5 sm:px-8 lg:px-16 mb-10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading eyebrow="Around the house" title="The garden, the park, the birds" />
        </div>
      </div>
      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 sm:scroll-px-8 lg:scroll-px-16 px-5 sm:px-8 lg:px-[max(4rem,calc((100vw-80rem)/2))] pb-4 scrollbar-none"
        tabIndex={0}
        aria-label="Photographs of the guesthouse and the park"
      >
        {PHOTOS.map((p) => (
          <figure
            key={p.src}
            className={`relative h-[300px] sm:h-[380px] shrink-0 snap-start overflow-hidden rounded-3xl ${
              p.wide ? "w-[85vw] sm:w-[560px]" : "w-[70vw] sm:w-[285px]"
            }`}
          >
            <Image src={p.src} alt={p.alt} fill sizes="(max-width: 640px) 85vw, 560px" className="object-cover" />
          </figure>
        ))}
      </div>
    </section>
  );
}
