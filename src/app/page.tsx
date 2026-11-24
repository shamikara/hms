import { Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { BookingWidget } from "@/components/landing/BookingWidget";
import { LocationSection } from "@/components/landing/LocationSection";
import { HeroGallery, type HeroSlide } from "@/components/landing/HeroGallery";
import { Highlights } from "@/components/landing/home/Highlights";
import { RoomsGrid } from "@/components/landing/home/RoomsGrid";
import { SafariFeature } from "@/components/landing/home/SafariFeature";
import { FoodAndEvenings } from "@/components/landing/home/FoodAndEvenings";
import { PhotoStrip } from "@/components/landing/home/PhotoStrip";
import { RatingsBand } from "@/components/landing/home/RatingsBand";
import { ClosingCta } from "@/components/landing/home/ClosingCta";
import { getSiteContent } from "@/features/site/services/site.service";
import { getPublicRooms } from "@/features/rooms/services/public-rooms.service";

/**
 * Real photographs of the property, day into night. Each arrives with its own
 * transition; see HeroGallery. To change the line-up, edit this list (files
 * live in public/hero).
 */
const heroSlides: HeroSlide[] = [
  { src: "/hero/hero-pool-pergola.webp", alt: "The pool and thatched pergola under a blue sky", transition: "fade", focus: "60% 60%" },
  { src: "/hero/hero-garden-path.webp", alt: "The garden path leading down to the pool", transition: "wipe", focus: "30% 70%" },
  { src: "/hero/hero-elephant-herd.webp", alt: "A herd of wild elephants grazing in Udawalawe National Park", transition: "iris", focus: "60% 55%" },
  { src: "/hero/hero-pool-frangipani.webp", alt: "Frangipani in bloom beside the pool", transition: "push", focus: "75% 70%" },
  { src: "/hero/hero-pool-above.webp", alt: "The pool and garden seen from above", transition: "split", focus: "45% 70%" },
  { src: "/hero/hero-pool-night.webp", alt: "The pool lit up at night under the trees", transition: "zoom", focus: "55% 65%" },
];

/** Rebuilt at least this often even if no admin change triggers it. */
export const revalidate = 3600;

export default async function Home() {
  const [{ contact, ratings, aggregate }, rooms] = await Promise.all([getSiteContent(), getPublicRooms()]);

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <HeroGallery slides={heroSlides}>
          <ScrollReveal delay={0.4}>
            <p className="mb-5 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              Udawalawe · Sri Lanka
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.6}>
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl leading-[1.05] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
              Lily Safari Resort
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/90">
              A small, family-run guesthouse beside Udawalawe National Park, with a pool in the garden,
              home-cooked food and safari jeeps arranged by the house.
            </p>
            {aggregate && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm text-white backdrop-blur-sm ring-1 ring-white/20">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />
                <span>
                  <strong>{aggregate.value}</strong> / 5 from {aggregate.count} guest reviews
                </span>
              </p>
            )}
          </ScrollReveal>
          <BookingWidget />
        </HeroGallery>

        <Highlights />
        {rooms && rooms.roomTypes.length > 0 && <RoomsGrid rooms={rooms} />}
        <SafariFeature />
        <FoodAndEvenings />
        <PhotoStrip />
        <RatingsBand ratings={ratings} aggregate={aggregate} />
        <LocationSection contact={contact} />
        <ClosingCta contact={contact} />
      </main>

      <PublicFooter />
    </div>
  );
}
