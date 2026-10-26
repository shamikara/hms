import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Compass, Sun, Moon, Clock, ArrowRight, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "Udawalawe Safari Drives",
  description: "Morning and afternoon safari jeeps into Udawalawe National Park, arranged by the house.",
  alternates: { canonical: "/safari" },
  openGraph: {
    title: "Udawalawe Safari Drives",
    description: "Morning and afternoon safari jeeps into Udawalawe National Park, arranged by the house.",
    url: "/safari",
  },
};

export default function SafariPage() {
  /**
   * The two drives the house arranges. Timings are the park's own gate hours,
   * not a promise about any particular jeep — the drivers are independent and
   * the team books whoever is free.
   */
  const experiences = [
    {
      title: "Morning Drive",
      timing: "Leaves before dawn",
      icon: Sun,
      image: "/safari-elephant-herd.webp",
      description:
        "The park opens at first light and this is when the elephants are most active and the heat is bearable. You leave before breakfast is served, so tell the team the night before and they will sort food for you.",
      highlights: [
        "Jeep and driver arranged by the house",
        "A short drive to the park entrance",
        "Park entrance fees paid at the gate",
      ],
    },
    {
      title: "Afternoon Drive",
      timing: "Leaves mid-afternoon",
      icon: Moon,
      image: "/safari-elephants-bush.webp",
      description:
        "The second gate slot of the day, back before dark. Easier if you have arrived late or would rather not start before sunrise, and the light towards the end is the better of the two for photographs.",
      highlights: [
        "Jeep and driver arranged by the house",
        "Back in time for dinner at the house",
        "Park entrance fees paid at the gate",
      ],
    },
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
                Arranged by the House
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif text-white leading-tight">
                Udawalawe Safari Drives
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-sm sm:text-base max-w-xl mx-auto">
                Udawalawe is elephant country, and herds are a near-certainty rather than a lucky
                sighting. Tell the team whether you want a morning or an afternoon drive and they
                will organise a jeep and a driver.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <Link
                href="/safari/drivers"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-emerald-700/60 bg-emerald-950/40 px-5 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-900/60"
              >
                <Users className="h-4 w-4" />
                Meet the drivers & pick yours
              </Link>
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
                        <span>Request This Drive</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </section>

        {/* What to expect */}
        <section className="py-16 px-6 sm:px-8 lg:px-16 bg-stone-900/60 border-t border-stone-850">
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            <span className="text-emerald-400 font-mono text-xs uppercase tracking-widest block">
              Worth Knowing
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif text-white">Before You Book a Drive</h3>
            <p className="text-stone-300 text-sm leading-relaxed">
              The jeeps and drivers are independent operators the house works with, not a fleet we
              own. Park entrance fees are set by the Department of Wildlife Conservation and are paid
              at the gate, separately from whatever you settle with the driver.
            </p>
            <p className="text-stone-400 text-sm leading-relaxed">
              We will tell you the current rates when you ask, rather than quote a figure here that
              may have moved.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
