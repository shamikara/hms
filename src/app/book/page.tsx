import { ScrollReveal, ParallaxHero } from "@/components/ui/ScrollReveal";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";

export default async function BookPage() {
  const property = { id: "resort_1" };

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col">
      <PublicHeader variant="transparent" />

      <main className="flex-1">
        <ParallaxHero imageSrc="/property-verandah-day.webp" alt="Book your stay at Udawalawe Resort">
          <ScrollReveal delay={0.2}>
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs sm:text-sm mb-4 block font-mono">
              Direct Sanctuary Reservations
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.4}>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif text-white leading-tight mb-8 drop-shadow-lg">
              Reserve Your Journey
            </h1>
          </ScrollReveal>
        </ParallaxHero>

        <section className="py-12 sm:py-24 px-4 sm:px-8 relative z-20 -mt-24 sm:-mt-32">
          {property ? (
            <BookingWizard propertyId={property.id} />
          ) : (
            <div className="text-center text-stone-500 py-12 bg-stone-900 rounded-2xl shadow-2xl max-w-4xl mx-auto border border-stone-800">
              We are currently unable to accept bookings. Please try again later.
            </div>
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
