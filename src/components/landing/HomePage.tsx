import { Star } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { BookingWidget } from "@/components/landing/BookingWidget";
import { LocationSection } from "@/components/landing/LocationSection";
import { HeroGallery } from "@/components/landing/HeroGallery";
import { Highlights } from "@/components/landing/home/Highlights";
import { RoomsGrid } from "@/components/landing/home/RoomsGrid";
import { SafariFeature } from "@/components/landing/home/SafariFeature";
import { FoodAndEvenings } from "@/components/landing/home/FoodAndEvenings";
import { WalkAround } from "@/components/landing/home/WalkAround";
import { PhotoStrip } from "@/components/landing/home/PhotoStrip";
import { ScrollTitles } from "@/components/landing/home/ScrollTitles";
import { RatingsBand } from "@/components/landing/home/RatingsBand";
import { ClosingCta } from "@/components/landing/home/ClosingCta";
import { getSiteContent } from "@/features/site/services/site.service";
import { getMediaContent } from "@/features/media/services/media.service";
import { getPublicRooms } from "@/features/rooms/services/public-rooms.service";
import type { Metadata } from "next";
import { HOME, LOCALE_PATH, fill, type Locale } from "@/lib/i18n/home";
import { Rich } from "@/lib/i18n/Rich";

/**
 * The homepage in one language. Rendered at / (English), /de and /fr.
 * Room names and descriptions come from the admin panel and stay as entered.
 */
export async function HomePage({ locale }: { locale: Locale }) {
  const t = HOME[locale];
  // Slideshow photos are chosen in Admin > Photos (built-in photos until then).
  const [{ contact, ratings, aggregate }, rooms, media] = await Promise.all([getSiteContent(), getPublicRooms(), getMediaContent()]);

  return (
    <div lang={locale} className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-emerald-800 selection:text-stone-100 flex flex-col">
      <PublicHeader locale={locale} />

      <main className="flex-1">
        <HeroGallery slides={media.heroSlides}>
          <ScrollReveal delay={0.4}>
            <p className="mb-5 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
              {t.hero.eyebrow}
            </p>
          </ScrollReveal>
          <ScrollReveal delay={0.6}>
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl leading-[1.05] text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.35)]">
              Lily Safari Resort
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-white/90">
              {t.hero.lead}
            </p>
            {aggregate && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm text-white backdrop-blur-sm ring-1 ring-white/20">
                <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />
                <span>
                  <Rich text={fill(t.hero.reviews, { value: aggregate.value, count: aggregate.count })} />
                </span>
              </p>
            )}
          </ScrollReveal>
          <BookingWidget t={t.widget} />
        </HeroGallery>

        <Highlights t={t.highlights} />
        <WalkAround t={t.walk} />
        {rooms && rooms.roomTypes.length > 0 && <RoomsGrid rooms={rooms} t={t.rooms} />}
        <ScrollTitles words={t.dividers.safari} tone="forest" />
        <SafariFeature t={t.safari} />
        <ScrollTitles words={t.dividers.food} reverse tone="stone" />
        <FoodAndEvenings t={t.food} />
        <PhotoStrip photos={media.galleryPhotos} t={t.photos} />
        <RatingsBand ratings={ratings} aggregate={aggregate} t={t.ratings} />
        <LocationSection contact={contact} t={t.location} />
        <ClosingCta contact={contact} t={t.cta} />
      </main>

      <PublicFooter locale={locale} />
    </div>
  );
}

/** hreflang links so Google shows each searcher the right language. */
export function homeMetadata(locale: Locale): Metadata {
  const t = HOME[locale];
  return {
    title: { absolute: t.meta.title },
    description: t.meta.description,
    alternates: {
      canonical: LOCALE_PATH[locale],
      languages: { en: "/", de: "/de", fr: "/fr", "x-default": "/" },
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      url: LOCALE_PATH[locale],
      locale: { en: "en_GB", de: "de_DE", fr: "fr_FR" }[locale],
    },
  };
}
