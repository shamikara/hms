import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Compass, Sun, Moon, Utensils, Shield, Camera, Clock, ArrowRight } from "lucide-react";

export default function SafariPage() {
  const experiences = [
    {
      title: "Dawn Elephant Gathering Drive",
      timing: "05:30 AM – 09:30 AM",
      icon: Sun,
      image: "/experiences-udawalawe.png",
      description:
        "Embark in custom open-top 4x4 Land Cruisers at first light to witness wild elephant herds bathing at the reservoir, accompanied by rare endemic bird sightings.",
      highlights: [
        "Private 4x4 Toyota Land Cruiser",
        "Senior Naturalist & Local Tracker",
        "Gourmet Bush Breakfast & Artisan Coffee",
        "High-Power Swarovski Binoculars Included",
      ],
    },
    {
      title: "Sunset Leopard & Bear Tracking",
      timing: "03:00 PM – 06:30 PM",
      icon: Moon,
      image: "/safari-leopard.png",
      description:
        "Explore the dense rocky outcrops and riverine forests during peak predator activity hours in search of the elusive Sri Lankan Leopard and Sloth Bear.",
      highlights: [
        "Optimal Low-Light Photography Setup",
        "Expert Predator Tracking Guidance",
        "Chilled Refreshment & Refreshing Towels",
        "Return for Sunset Sundowners at Lodge",
      ],
    },
    {
      title: "Candlelit Bush Dining & Stargazing",
      timing: "07:30 PM – 10:30 PM",
      icon: Utensils,
      image: "/safari-dining.png",
      description:
        "A private 5-course candlelit dinner served deep inside a secluded forest clearing under the equatorial night sky, paired with sommelier-selected wines.",
      highlights: [
        "Private Chef & Dedicated Waitstaff",
        "Open Campfire & Lantern Ambiance",
        "Stargazing Guidance with Celestial Telescope",
        "5-Course Organic Tasting Menu",
      ],
    },
  ];

  const vehicleSpecs = [
    { label: "Fleet Vehicles", detail: "Custom Toyota Land Cruiser 70-Series" },
    { label: "Seating Layout", detail: "Tiered 3-Row Open-Air Observation Seats" },
    { label: "Optics & Camera", detail: "Stabilized Telephoto Lens Mounts + Swarovski Optics" },
    { label: "Onboard Amenities", detail: "Iced Hydration Bar + USB-C Charging Stations" },
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
                Guided Wilderness Expeditions
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight">
                Udawalawe Safari Excursions
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto">
                Sri Lanka's premier elephant sanctuary experienced with master naturalists, open 4x4 vehicles, and bespoke wilderness hospitality.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Experiences Grid */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto space-y-16">
          {experiences.map((exp, index) => {
            const Icon = exp.icon;
            return (
              <ScrollReveal key={index} delay={index * 0.1}>
                <div className="bg-stone-900/40 rounded-3xl border border-stone-800 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-8 items-center p-6 sm:p-8 hover:border-emerald-800/60 transition-all shadow-2xl">
                  {/* Image */}
                  <div className={`lg:col-span-6 relative h-[320px] sm:h-[400px] rounded-2xl overflow-hidden ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                    <Image
                      src={exp.image}
                      alt={exp.title}
                      fill
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 bg-stone-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-xs font-mono text-emerald-400 flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{exp.timing}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className={`lg:col-span-6 space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-serif text-white">{exp.title}</h2>
                      <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
                        {exp.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-stone-800">
                      {exp.highlights.map((hl, hIdx) => (
                        <div key={hIdx} className="flex items-center space-x-2.5 text-xs text-stone-300">
                          <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <Link
                        href="/book"
                        className="px-6 py-3 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs uppercase tracking-wider transition-colors inline-flex items-center space-x-2 shadow-lg"
                      >
                        <span>Reserve Experience</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </section>

        {/* Fleet & Specs */}
        <section className="py-16 px-6 sm:px-8 lg:px-16 bg-stone-900/60 border-t border-stone-850">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest block">Safari Operations Standards</span>
              <h3 className="text-2xl sm:text-3xl font-serif text-white">Custom Safari Fleet & Optics</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {vehicleSpecs.map((spec, i) => (
                <div key={i} className="p-6 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                  <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block">{spec.label}</span>
                  <p className="text-sm font-serif text-stone-100">{spec.detail}</p>
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
