import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Shield, Leaf, Sun, Heart, Globe, Award, Sparkles } from "lucide-react";

export const metadata = {
  title: "Conservation & Sustainability",
  description: "Learn about our commitment to wild elephant protection, 100% solar off-grid energy, local community empowerment, and zero-single-use-plastic policy.",
};

export default function SustainabilityPage() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-emerald-800 selection:text-stone-100">
      <PublicHeader variant="solid" />

      {/* Hero */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden border-b border-stone-850">
        <Image
          src="/safari-elephants-bush.webp"
          alt="Conservation at Wildlily Safari Resort"
          fill
          priority
          className="object-cover brightness-[0.4] scale-105 transition-transform duration-1000"
        />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4">
          <ScrollReveal direction="down" delay={0.1}>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-700/50">
              Guarding the Wilderness
            </span>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight">
              Conservation & Sustainability
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-stone-300 max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed">
              Living in harmony with Udawalawe's wild elephant herds. Preserving ecosystems, empowering local communities, and operating 100% off-grid.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-24 px-6 sm:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto space-y-20">
          {/* Pillar 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-[380px] sm:h-[450px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
              <Image
                src="/safari-elephant-calf.webp"
                alt="Udawalawe Elephant Protection"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Heart className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest block">
                Pillar I: Wildlife Protection
              </span>
              <h2 className="text-3xl font-serif text-white">Elephant Conservation & Rehabilitation</h2>
              <p className="text-stone-300 text-base leading-relaxed">
                Wildlily Safari Resort works hand-in-hand with the Department of Wildlife Conservation and the local Elephant Transit Home (ETH). A portion of every stay directly funds orphan elephant milk formula, veterinary care, and radio-collar tracking.
              </p>
              <ul className="space-y-2 text-xs font-mono text-stone-400">
                <li>• 10% of room revenues donated to Elephant Transit Home</li>
                <li>• Zero-harassment wildlife viewing protocols during game drives</li>
                <li>• Native flora corridor preservation along reserve boundaries</li>
              </ul>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center lg:flex-row-reverse">
            <div className="space-y-6 lg:order-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                <Sun className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest block">
                Pillar II: Off-Grid Renewable Energy
              </span>
              <h2 className="text-3xl font-serif text-white">100% Solar & Zero Plastic Policy</h2>
              <p className="text-stone-300 text-base leading-relaxed">
                Our entire lodge operates on a 250kW solar photovoltaic microgrid backed by lithium energy storage. Single-use plastics are strictly prohibited across the resort; all water is purified on-site and served in reusable glass carafes.
              </p>
              <ul className="space-y-2 text-xs font-mono text-stone-400">
                <li>• Solar hot water across the guest rooms</li>
                <li>• On-site glass water bottling plant & rainwater harvesting</li>
                <li>• Closed-loop organic composting for estate vegetable gardens</li>
              </ul>
            </div>
            <div className="relative h-[380px] sm:h-[450px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl lg:order-1">
              <Image
                src="/property-garden.webp"
                alt="Resort garden and grounds"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
