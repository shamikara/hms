import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Users, Maximize2, Sparkles, Check, ArrowRight, ShieldCheck } from "lucide-react";

export default function RoomsPage() {
  const roomTypes = [
    {
      id: "presidential-villa",
      name: "Presidential Safari Villa",
      price: "$1,200",
      per: "night",
      capacity: "4 Guests",
      size: "250 sq.m",
      image: "/villa-pool.png",
      description:
        "Our flagship residence boasting a private infinity plunge pool overhanging the reserve, dual master bedrooms, dedicated personal butler service, and outdoor moonlit baths.",
      features: [
        "Private 10m Infinity Plunge Pool",
        "Dedicated 24/7 Butler Service",
        "Panoramic Canopy Observation Deck",
        "Indoor & Outdoor Rain Showers",
        "Complimentary Premium Mini-Bar",
        "Privileged Safari Drive Priority",
      ],
    },
    {
      id: "family-suite",
      name: "Family Wilderness Suite",
      price: "$850",
      per: "night",
      capacity: "6 Guests",
      size: "180 sq.m",
      image: "/accommodation-udawalawe.png",
      description:
        "Spacious two-bedroom retreat thoughtfully designed for families. Features a private firepit terrace, plush living room, and direct access to guided nature trails.",
      features: [
        "Two Master King Bedrooms",
        "Private Campfire Lounge Terrace",
        "Deep Soaking Freestanding Tub",
        "Teak Dining & Living Pavilion",
        "Starlink Satellite Wi-Fi",
        "Junior Ranger Safari Kits Included",
      ],
    },
    {
      id: "luxury-tent",
      name: "Luxury Canvas Pavilion",
      price: "$450",
      per: "night",
      capacity: "2 Guests",
      size: "85 sq.m",
      image: "/accommodation-udawalawe.png",
      description:
        "Ultra-luxury air-conditioned canvas suite offering an intimate wilderness experience with hand-carved mahogany furnishings, private veranda, and jungle views.",
      features: [
        "Custom Climate Control",
        "Private Shaded Veranda",
        "Four-Poster Teak King Bed",
        "Organic Botanical Toiletries",
        "High-End Bushell Binoculars",
        "Twice-Daily Housekeeping",
      ],
    },
  ];

  const amenities = [
    "24/7 Dedicated Butler Service",
    "Starlink High-Speed Wi-Fi",
    "Nespresso Espresso Machines",
    "Organic Herbal Spa Toiletries",
    "Twice-Daily Housekeeping & Turn-Down",
    "In-Villa Dining & Cocktail Bar",
    "Wilderness Telescope & Binocular Kit",
    "Complimentary Laundry Service",
  ];

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader variant="solid" />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="relative py-24 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850 text-center">
          <div className="max-w-4xl mx-auto space-y-4">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                Sanctuary Accommodations
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight">
                Villas & Canvas Pavilions
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto">
                Designed to harmonize with the dry-zone sanctuary. Every suite offers uncompromised 5-star comfort and unobstructed views of Sri Lanka’s untamed nature.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Room Showcase List */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto space-y-20">
          {roomTypes.map((room, index) => (
            <ScrollReveal key={room.id} delay={index * 0.1}>
              <div className="bg-stone-900/40 rounded-3xl border border-stone-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-8 hover:border-stone-700 transition-all shadow-2xl">
                {/* Image */}
                <div className={`lg:col-span-6 relative h-[350px] sm:h-[420px] rounded-2xl overflow-hidden ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 bg-stone-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-mono text-emerald-400">
                    {room.price} <span className="text-stone-400">/ {room.per}</span>
                  </div>
                </div>

                {/* Content */}
                <div className={`lg:col-span-6 space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-4 text-xs font-mono text-stone-400">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{room.capacity}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{room.size}</span>
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif text-white">{room.name}</h2>
                    <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                      {room.description}
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    {room.features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-center space-x-2 text-xs text-stone-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center space-x-4">
                    <Link
                      href="/book"
                      className="px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs uppercase tracking-wider transition-colors inline-flex items-center space-x-2 shadow-lg"
                    >
                      <span>Reserve This Suite</span>
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
              <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest block">Standard Across All Accommodations</span>
              <h3 className="text-2xl sm:text-3xl font-serif text-white">5-Star Wilderness Amenities</h3>
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
