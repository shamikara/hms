import type { Metadata } from "next";
import { ScrollReveal, ParallaxHero } from "@/components/ui/ScrollReveal";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { getBookableProperty } from "@/features/bookings/actions/booking.actions";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { PublicFooter } from "@/components/navigation/PublicFooter";

export const metadata: Metadata = {
  title: "Book Your Stay",
  description: "Check availability and request a room at Wildlily Safari Resort, Udawalawe.",
  alternates: { canonical: "/book" },
  openGraph: {
    title: "Book Your Stay",
    description: "Check availability and request a room at Wildlily Safari Resort, Udawalawe.",
    url: "/book",
  },
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function readDate(value: string | string[] | undefined) {
  return typeof value === "string" && ISO_DATE.test(value) ? value : "";
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const propertyResult = await getBookableProperty();
  const property = propertyResult.success ? propertyResult.data : null;

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col">
      <BreadcrumbJsonLd trail={[{ name: "Home", path: "/" }, { name: "Book a Stay", path: "/book" }]} />
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
            <BookingWizard
              propertyId={property.id}
              currencyCode={property.baseCurrency}
              initialCheckIn={readDate(params.checkIn)}
              initialCheckOut={readDate(params.checkOut)}
            />
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
