import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Utensils, Flame, Wine, Leaf, Clock, Award } from "lucide-react";

export const metadata = {
  title: "Wilderness Gastronomy & Dining | Wildlily Safari Resort",
  description: "Experience farm-to-table fine dining, private candlelit bush dinners, and sommelier-curated wines in the heart of Udawalawe sanctuary.",
};

const diningExperiences = [
  {
    title: "The Jungle Pavilion",
    subtitle: "All-Day Estate Dining",
    image: "/lily-resort-hero.png",
    description:
      "An open-air teak dining pavilion surrounded by lush tropical gardens and natural water lilies. Serving organic farm-to-table breakfast, Sri Lankan curries, and modern European dishes.",
    highlights: ["Organic Estate Ingredients", "Live Cooking Stations", "Artisan Ceylon Teas & Coffees"],
  },
  {
    title: "Candlelit Bush Dining",
    subtitle: "Private Wilderness Clearing",
    image: "/lily-bush-dining.png",
    description:
      "Dine under equatorial stars deep inside a secluded forest clearing. Surrounded by tiki torches and a glowing bonfire, enjoy a private 5-course tasting menu prepared by your personal chef.",
    highlights: ["Personal Chef & Butler", "5-Course Tasting Menu", "Open Firepit & Celestial Stargazing"],
  },
  {
    title: "The Sommelier Wine Cellar",
    subtitle: "Reserve Wines & Spirits",
    image: "/lily-presidential-villa.png",
    description:
      "Our climate-controlled cellar houses over 250 rare vintages from Old and New World vineyards, handcrafted single malts, and signature Sri Lankan botanical cocktails.",
    highlights: ["250+ Global Wine Vintages", "Sommelier-Led Tastings", "Botanical Sundowner Cocktails"],
  },
];

export default function DiningPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-emerald-800 selection:text-stone-100">
      <PublicHeader variant="solid" />

      {/* Hero Banner */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden border-b border-stone-850">
        <Image
          src="/lily-bush-dining.png"
          alt="Wilderness Dining at Wildlily Safari Resort"
          fill
          priority
          className="object-cover brightness-[0.4] scale-105 transition-transform duration-1000"
        />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4">
          <ScrollReveal direction="down" delay={0.1}>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-700/50">
              Gastronomy & Culinary Art
            </span>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight">
              Wilderness Dining & Cellar
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-stone-300 max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed">
              Savor organic farm-to-table delicacies, fine reserve wines, and romantic candlelit bush dinners under the Sri Lankan night sky.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Culinary Pillars */}
      <section className="py-20 px-6 sm:px-12 lg:px-24 bg-stone-900 border-b border-stone-850">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white">Estate-Grown Organic</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Over 70% of our vegetables, herbs, and tropical fruits are harvested daily from our own 5-acre organic resort gardens.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white">Authentic Fire Pit Cooking</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Traditional clay pot cooking over cinnamon wood fires brings out deep, complex aromas in classic Sri Lankan specialties.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Wine className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white">Curated Sommelier Cellar</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Hand-selected organic and biodynamic wines from Bordeaux, Marlborough, Napa Valley, and Stellenbosch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dining Venues Showcase */}
      <section className="py-24 px-6 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto space-y-20">
          {diningExperiences.map((venue, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                index % 2 === 1 ? "lg:flex-row-reverse" : "lg:flex-row"
              } gap-12 items-center`}
            >
              <div className="w-full lg:w-1/2 relative h-[380px] sm:h-[450px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl group">
                <Image
                  src={venue.image}
                  alt={venue.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>

              <div className="w-full lg:w-1/2 space-y-6">
                <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
                  {venue.subtitle}
                </span>
                <h2 className="text-3xl sm:text-4xl font-serif text-white">{venue.title}</h2>
                <p className="text-stone-300 text-base leading-relaxed">{venue.description}</p>

                <ul className="space-y-2.5 pt-2">
                  {venue.highlights.map((h, i) => (
                    <li key={i} className="flex items-center space-x-3 text-sm text-stone-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4">
                  <Link
                    href="/book"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-full text-xs font-mono uppercase tracking-wider transition-colors shadow-lg"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Reserve Dining Experience</span>
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
