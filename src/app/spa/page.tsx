import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Sparkles, Heart, Flower2, Droplets, Sun, Calendar } from "lucide-react";

export const metadata = {
  title: "Wilderness Spa & Ayurveda Wellness | Wildlily Safari Resort",
  description: "Rejuvenate with ancient Sri Lankan Ayurveda rituals, botanical massages, and forest infinity pool therapies at Wildlily Safari Resort.",
};

const spaTreatments = [
  {
    name: "Udawalawe Herbal Abhyanga Ritual",
    duration: "90 Minutes",
    price: "$180",
    description: "Full-body warm herbal oil massage utilizing wild Sri Lankan botanicals, followed by an herbal steam bath to detoxify skin and soothe safari-weary muscles.",
  },
  {
    name: "Ceylon Tea & Spiced Body Polish",
    duration: "60 Minutes",
    price: "$140",
    description: "Exfoliating scrub crafted from black Ceylon tea leaves, cardamom, and virgin coconut oil. Leaves skin deeply nourished and radiant.",
  },
  {
    name: "Canopy Infinity Plunge Hydrotherapy",
    duration: "45 Minutes",
    price: "$95",
    description: "Private outdoor plunge pool soak infused with wild frangipani flowers and mineral salts, overlooking the jungle canopy at golden hour.",
  },
  {
    name: "Shirodhara Deep Calm Ceremony",
    duration: "75 Minutes",
    price: "$165",
    description: "Continuous rhythmic pouring of warm medicated herbal oil onto the third eye chakra, promoting profound mental clarity and restorative sleep.",
  },
];

export default function SpaPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-emerald-800 selection:text-stone-100">
      <PublicHeader variant="solid" />

      {/* Hero Banner */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden border-b border-stone-850">
        <Image
          src="/pool-loungers.webp"
          alt="Poolside loungers at Wildlily Safari Resort"
          fill
          priority
          className="object-cover brightness-[0.45] scale-105 transition-transform duration-1000"
        />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4">
          <ScrollReveal direction="down" delay={0.1}>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-700/50">
              Sanctuary of Healing
            </span>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight">
              Wilderness Spa & Ayurveda
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-stone-300 max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed">
              Immense tranquility nestled in nature. Experience centuries-old Sri Lankan holistic wellness rituals and soothing botanical therapies.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Wellness Pillars */}
      <section className="py-20 px-6 sm:px-12 lg:px-24 bg-stone-900 border-b border-stone-850">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Flower2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white">Traditional Ayurveda Doctors</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Consult with resident Ayurvedic doctors to customize personal pulse diagnosis, body dosha balance, and custom herbal elixirs.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Droplets className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white">Wild Organic Botanicals</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Our massage oils, compresses, and body wraps are formulated using hand-harvested wild herbs, gotu kola, turmeric, and King coconut oil.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Sun className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-serif text-white">Sunrise Jungle Yoga</h3>
              <p className="text-stone-400 text-sm leading-relaxed">
                Begin your morning with guided pranayama breathing and hatha yoga on our elevated teak deck as peacocks call in the distance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Spa Menu */}
      <section className="py-24 px-6 sm:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400">
              Signature Treatments
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-white">The Spa Menu</h2>
            <p className="text-stone-400 text-sm max-w-xl mx-auto">
              All spa rituals include a complimentary warm herbal tea consultation and access to our open-air jungle hydrotherapy pool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {spaTreatments.map((item, idx) => (
              <div key={idx} className="p-8 rounded-2xl bg-stone-900 border border-stone-800 space-y-4 hover:border-emerald-700/60 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-serif font-semibold text-white">{item.name}</h3>
                    <span className="text-xs font-mono text-emerald-400">{item.duration}</span>
                  </div>
                  <span className="text-xl font-serif font-bold text-white">{item.price}</span>
                </div>
                <p className="text-stone-300 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center pt-8">
            <Link
              href="/contact"
              className="inline-flex items-center space-x-2 px-8 py-3.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-full text-xs font-mono uppercase tracking-wider transition-colors shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book Wellness Appointment</span>
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
