import { ScrollReveal, ParallaxHero } from "@/components/ui/ScrollReveal";
import { BookingWizard } from "@/components/booking/BookingWizard";
import prisma from "@/core/db/prisma";

export default async function BookPage() {
  // For the purpose of the booking flow, we assume there is at least one property
  const property = { id: "resort_1" };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans text-stone-900 dark:text-stone-100">
      <ParallaxHero imageSrc="/hero-bg-udawalawe.png" alt="Book your stay at Udawalawe Resort">
        <ScrollReveal delay={0.2}>
          <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-6 block">Reservations</span>
        </ScrollReveal>
        <ScrollReveal delay={0.4}>
          <h2 className="text-5xl md:text-7xl font-serif text-white leading-tight mb-8 drop-shadow-lg">
            Reserve Your Journey
          </h2>
        </ScrollReveal>
      </ParallaxHero>

      <section className="py-24 px-4 sm:px-8 relative z-20 -mt-32">
        {property ? (
          <BookingWizard propertyId={property.id} />
        ) : (
          <div className="text-center text-stone-500 py-12 bg-white dark:bg-stone-900 rounded-2xl shadow-2xl max-w-4xl mx-auto">
            We are currently unable to accept bookings. Please try again later.
          </div>
        )}
      </section>
    </div>
  );
}
