import Image from "next/image";
import { SectionHeading } from "./SectionHeading";
import { DEFAULT_GALLERY_PHOTOS } from "@/features/media/lib/builtin";
import { HOME, type HomeDict } from "@/lib/i18n/home";

export interface StripPhoto {
  src: string;
  alt: string;
  wide: boolean;
}

/**
 * An endless row of photographs drifting slowly sideways. The list is drawn
 * twice so the loop has no visible seam; hovering (or tabbing in) pauses it.
 * With reduced motion it becomes a still row you can scroll by hand.
 */
export function PhotoStrip({
  photos = DEFAULT_GALLERY_PHOTOS,
  t = HOME.en.photos,
}: {
  photos?: StripPhoto[];
  t?: HomeDict["photos"];
}) {
  const row = (copy: boolean) => (
    <div className={`flex shrink-0 ${copy ? "marquee-copy" : ""}`} aria-hidden={copy || undefined}>
      {photos.map((p, i) => (
        <figure
          key={`${p.src}-${i}`}
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
          <SectionHeading eyebrow={t.eyebrow} title={t.title} />
        </div>
      </div>
      <div className="marquee marquee-fade overflow-hidden scrollbar-none" aria-label={t.label} role="region">
        <div className="marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
