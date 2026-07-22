import { ScrollReveal, ParallaxHero } from "@/components/ui/ScrollReveal";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { BookingWidget } from "@/components/landing/BookingWidget";
import { RoomCarousel } from "@/components/landing/RoomCarousel";
import { MasonryGallery } from "@/components/landing/MasonryGallery";
import { LocationSection } from "@/components/landing/LocationSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <ParallaxHero imageSrc="/lily-resort-hero.png" alt="Lily Resort Udawalawe luxury safari lodge at sunset">
          <ScrollReveal delay={0.4}>
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs sm:text-sm mb-4 sm:mb-6 block font-mono">Welcome to Sri Lanka</span>
          </ScrollReveal>
          <ScrollReveal delay={0.6}>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif text-white leading-tight mb-6 sm:mb-8 drop-shadow-lg">
              Untamed Luxury at Lily Resort
            </h1>
          </ScrollReveal>
          <BookingWidget />
        </ParallaxHero>

        {/* Accommodation Carousel Section */}
        <section className="py-12 sm:py-24 px-4 sm:px-8 lg:px-16 bg-stone-950 text-stone-100 relative z-20 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <RoomCarousel />
          </div>
        </section>

        {/* Photo Gallery Section */}
        <section className="py-24 bg-stone-900 text-stone-100 overflow-hidden">
          <div className="mx-auto px-4 md:px-8">
            <MasonryGallery />
          </div>
        </section>

        {/* Location & Map Section */}
        <LocationSection />
      </main>

      <PublicFooter />
    </div>
  );
}
