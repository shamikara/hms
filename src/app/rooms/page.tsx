import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Users, Sparkles, Check, ArrowRight } from "lucide-react";
import { getPublicRooms } from "@/features/rooms/services/public-rooms.service";

export const metadata: Metadata = {
  title: "Rooms & Rates",
  description: "Air-conditioned rooms with private bathrooms, free Wi-Fi and pool or garden views, a short drive from Udawalawe National Park.",
  alternates: { canonical: "/rooms" },
  openGraph: {
    title: "Rooms & Rates",
    description: "Air-conditioned rooms with private bathrooms, free Wi-Fi and pool or garden views, a short drive from Udawalawe National Park.",
    url: "/rooms",
  },
};

/** Rebuilt at least this often even if no admin change triggers it. */
export const revalidate = 3600;

export default async function RoomsPage() {
  const rooms = await getPublicRooms();
  const money = new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: rooms?.currencyCode ?? "LKR",
    maximumFractionDigits: 0,
  });

  const amenities = [
    "Outdoor Swimming Pool",
    "Free Private Parking",
    "Free Wi-Fi Throughout",
    "On-Site Restaurant",
    "Safari Jeep Booking",
    "Air Conditioning In Every Room",
    "Complimentary Toiletries & Hair Dryer",
    "Housekeeping On Request",
  ];

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <BreadcrumbJsonLd trail={[{ name: "Home", path: "/" }, { name: "Rooms & Rates", path: "/rooms" }]} />
      <PublicHeader variant="solid" />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="relative py-24 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850 text-center">
          <div className="max-w-4xl mx-auto space-y-4">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                Accommodation
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight">
                Rooms & Suites
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto">
                Air-conditioned rooms a short drive from the Udawalawe National Park entrance, with an outdoor pool, home-cooked Sri Lankan food and safari jeeps arranged by the house.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Room Showcase List */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto space-y-20">
          {rooms === null && (
            <p className="text-center text-stone-400 text-sm">
              We could not load the rooms just now. Please refresh, or contact us and we will tell you what is free.
            </p>
          )}
          {rooms?.roomTypes.length === 0 && (
            <p className="text-center text-stone-400 text-sm">
              No rooms are open for booking at the moment. Please contact us about your dates.
            </p>
          )}
          {rooms?.roomTypes.map((room, index) => (
            <ScrollReveal key={room.id} delay={index * 0.1}>
              <div className="bg-stone-900/40 rounded-3xl border border-stone-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-8 hover:border-stone-700 transition-all shadow-2xl">
                {/* Image */}
                <div className={`lg:col-span-6 relative h-[350px] sm:h-[420px] rounded-2xl overflow-hidden ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Image
                    src={room.imageUrl}
                    alt={room.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-stone-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-mono text-emerald-400">
                    {room.basePrice === null ? (
                      "Rates on request"
                    ) : (
                      <>
                        {money.format(room.basePrice)}
                        <span className="text-stone-400"> / night</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className={`lg:col-span-6 space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-xs font-mono text-stone-400">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sleeps {room.capacity}</span>
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif text-white">{room.name}</h2>
                    {room.description && (
                      <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                        {room.description}
                      </p>
                    )}
                  </div>

                  {/* Highlights Grid */}
                  {room.features.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {room.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center space-x-2 text-xs text-stone-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  )}

                  <div className="pt-4 flex items-center space-x-4">
                    <Link
                      href="/book"
                      className="px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs uppercase tracking-wider transition-colors inline-flex items-center space-x-2 shadow-lg"
                    >
                      <span>Reserve This Room</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </section>

        {/* Global Included Amenities */}
        <section className="py-16 px-6 sm:px-8 lg:px-16 bg-stone-900/60 border-t border-stone-850">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest block">Standard In Every Room</span>
              <h3 className="text-2xl sm:text-3xl font-serif text-white">What Is Included</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {amenities.map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center space-x-3 text-xs text-stone-300">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
