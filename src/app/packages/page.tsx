import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Compass, Sparkles, Heart, Shield, Check, Calendar, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Exclusive Safari Packages & Offers | Wildlily Safari Resort",
  description: "Explore curated luxury stay packages including all-inclusive safari game drives, honeymoon escapes, and wildlife photography expeditions.",
};

const packages = [
  {
    title: "The Grand Udawalawe Expedition",
    duration: "4 Nights / 5 Days",
    tag: "MOST POPULAR",
    price: "$4,200",
    per: "per couple",
    image: "/safari-herd-plains.webp",
    description: "The definitive safari experience combining luxury villa living with daily private 4x4 game drives and naturalist-guided tracking.",
    inclusions: [
      "Accommodation in Presidential Safari Villa",
      "All-Inclusive Farm-to-Table Meals & Reserve Wines",
      "3 Private 4x4 Land Cruiser Game Drives",
      "Private Candlelit Bush Dinner with Personal Chef",
      "Home-Cooked Sri Lankan Dinner For Two",
      "Roundtrip Luxury Helicopter / SUV Airport Transfers",
    ],
  },
  {
    title: "Wilderness Honeymoon Sanctuary",
    duration: "3 Nights / 4 Days",
    tag: "ROMANCE ESCAPE",
    price: "$3,100",
    per: "per couple",
    image: "/pool-night.webp",
    description: "An intimate romantic retreat designed for newlyweds. Enjoy candlelit bush dining, moonlit baths, and sunset champagne sundowners.",
    inclusions: [
      "Stay in Luxury Canvas Pavilion or Villa",
      "Daily Champagne Breakfast in Bed",
      "Private Sunset Sundowner Cocktail Experience",
      "Guided Dawn Elephant Drive with Senior Ranger",
      "Romantic Candlelit Bush Dining Clearing",
      "Special Honeymoon Turndown & Flower Bath",
    ],
  },
  {
    title: "Wild Photography & Leopard Quest",
    duration: "5 Nights / 6 Days",
    tag: "EXPERT NATURALIST",
    price: "$5,400",
    per: "per person",
    image: "/safari-reservoir.webp",
    description: "Tailored specifically for wildlife photographers and enthusiasts seeking rare Sri Lankan leopard, sloth bear, and bird sightings.",
    inclusions: [
      "Private Custom Open-Top Camera Rigged Land Cruiser",
      "Dedicated Master Wildlife Naturalist & Local Tracker",
      "Priority Access & Off-Grid Observation Zones",
      "Swarovski HD Optics & Camera Mounting Gear",
      "Evening Photography Review & Editing Lounge",
      "All Meals, Safari Park Fees & Daily Refreshments",
    ],
  },
];

export default function PackagesPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-emerald-800 selection:text-stone-100">
      <PublicHeader variant="solid" />

      {/* Hero */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden border-b border-stone-850">
        <Image
          src="/safari-elephants-bush.webp"
          alt="Curated Safari Packages"
          fill
          priority
          className="object-cover brightness-[0.4] scale-105 transition-transform duration-1000"
        />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4">
          <ScrollReveal direction="down" delay={0.1}>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-700/50">
              Bespoke Journeys
            </span>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight">
              Exclusive Packages & Offers
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-stone-300 max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed">
              Carefully curated itineraries blending private game drives, gourmet dining, and restorative wellness.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Package Cards */}
      <section className="py-24 px-6 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto space-y-16">
          {packages.map((pkg, idx) => (
            <div
              key={idx}
              className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col lg:flex-row hover:border-emerald-700/60 transition-colors"
            >
              <div className="w-full lg:w-5/12 relative h-[320px] lg:h-auto">
                <Image
                  src={pkg.image}
                  alt={pkg.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-emerald-950/90 text-emerald-400 border border-emerald-700/60 px-3 py-1 rounded-full font-mono text-[11px] font-semibold tracking-wider uppercase">
                  {pkg.tag}
                </div>
              </div>

              <div className="w-full lg:w-7/12 p-8 sm:p-12 flex flex-col justify-between space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div>
                      <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
                        {pkg.duration}
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-serif text-white mt-1">{pkg.title}</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-serif font-bold text-white block">{pkg.price}</span>
                      <span className="text-xs font-mono text-stone-400">{pkg.per}</span>
                    </div>
                  </div>

                  <p className="text-stone-300 text-sm leading-relaxed">{pkg.description}</p>

                  <div className="pt-4 border-t border-stone-800">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 mb-3">
                      Package Inclusions:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {pkg.inclusions.map((inc, i) => (
                        <div key={i} className="flex items-center space-x-2.5 text-xs text-stone-300">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{inc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-stone-800 flex justify-end">
                  <Link
                    href="/book"
                    className="w-full sm:w-auto px-8 py-3.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-full text-xs font-mono uppercase tracking-wider font-semibold transition-colors shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>Reserve Package</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
