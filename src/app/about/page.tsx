import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ShieldCheck, Leaf, Sun, Compass, Award, Users } from "lucide-react";

export default function AboutPage() {
  const pillars = [
    {
      icon: Leaf,
      title: "Wild Habitat Protection",
      description:
        "Over 30% of our annual profits directly fund local anti-poaching patrols, elephant migration corridor restoration, and habitat monitoring around Udawalawe National Park.",
    },
    {
      icon: Sun,
      title: "100% Solar & Eco-Tech",
      description:
        "Powered entirely by our off-grid solar micro-array, with closed-loop thermodynamic water heating, greywater bio-filtration, and zero single-use plastics across the property.",
    },
    {
      icon: ShieldCheck,
      title: "Biophilic Eco-Architecture",
      description:
        "Designed to blend imperceptibly into the canopy using hand-carved local granite, reclaimed teak, and open-air timber frames that eliminate the need for artificial cooling.",
    },
    {
      icon: Compass,
      title: "Expert Senior Trackers",
      description:
        "Our naturalist team comprises veteran Sri Lankan rangers with over 15 years of experience in elephant behavior, bird taxonomy, and wildlife photography guidance.",
    },
  ];

  const team = [
    {
      name: "Chaminda Bandara",
      role: "Head Wildlife Naturalist",
      bio: "18 years tracking elephant herds and Sri Lankan leopards across the southern wild corridors.",
    },
    {
      name: "Elena Rostova",
      role: "General Manager",
      bio: "Former luxury lodge director with 12 years managing boutique wilderness resorts in East Africa and South Asia.",
    },
    {
      name: "Chef Kanishka Silva",
      role: "Executive Culinary Director",
      bio: "Pioneer of modern Sri Lankan eco-gastronomy utilizing organic produce from our estate garden.",
    },
  ];

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <PublicHeader variant="solid" />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="relative py-24 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850 overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs sm:text-sm font-mono block">
                Our Story & Heritage
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-white leading-tight">
                A Sanctuary Built in Harmony with the Wild
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Founded in 2012 at the border of Udawalawe National Park, our lodge was envisioned as a haven where luxury hospitality directly empowers wildlife conservation.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Narrative & History */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <ScrollReveal direction="right">
            <div className="space-y-6">
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                The Heritage
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight">
                Where the Jungle Canopy Meets 5-Star Serenity
              </h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                Wildlily Safari Resort was established not merely as a hotel, but as a living conservation sanctuary. Set across 25 acres of pristine dry-zone forest, our villas were built using traditional timber craftsmanship without felling a single ancient tree.
              </p>
              <p className="text-stone-400 text-sm leading-relaxed">
                Guests awake to the morning call of peacocks and wild hornbills, enjoying private infinity plunge pools that overlook natural watering holes visited daily by wild elephant herds.
              </p>

              <div className="pt-4 grid grid-cols-2 gap-6 border-t border-stone-850">
                <div>
                  <span className="text-3xl font-serif text-emerald-400 block">250+</span>
                  <span className="text-xs text-stone-400 font-mono">Resident Elephants Tracked</span>
                </div>
                <div>
                  <span className="text-3xl font-serif text-emerald-400 block">100%</span>
                  <span className="text-xs text-stone-400 font-mono">Renewable Energy Grid</span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 h-[450px]">
              <Image
                src="/lily-resort-hero.png"
                alt="Wildlily Safari Resort Sanctuary"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl">
                <span className="text-emerald-400 text-xs font-mono font-medium block">Udawalawe Border Conservation Zone</span>
                <p className="text-xs text-stone-300 mt-1">Direct access to Sri Lanka’s premier elephant safari preserve.</p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Core Pillars */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 bg-stone-900/60 border-y border-stone-850">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                Ethos & Principles
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">
                Our Four Conservation Pillars
              </h2>
              <p className="text-stone-400 text-sm">
                Every stay at Udawalawe Resort actively supports local communities and ecosystem preservation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {pillars.map((pillar, i) => {
                const Icon = pillar.icon;
                return (
                  <ScrollReveal key={i} delay={i * 0.1}>
                    <div className="bg-stone-950 p-8 rounded-2xl border border-stone-800 space-y-4 hover:border-emerald-700/50 transition-colors h-full flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-6">
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-serif text-white mb-2">{pillar.title}</h3>
                        <p className="text-xs text-stone-400 leading-relaxed">{pillar.description}</p>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
              Naturalists & Hospitality
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-white">
              Guided by Passionate Stewards
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, i) => (
              <ScrollReveal key={i} delay={i * 0.15}>
                <div className="bg-stone-900/40 p-6 rounded-2xl border border-stone-800 space-y-3 hover:bg-stone-900/80 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-900/40 text-emerald-400 flex items-center justify-center font-mono font-bold text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <h3 className="text-lg font-serif text-white">{member.name}</h3>
                  <span className="text-xs font-mono text-emerald-400 block">{member.role}</span>
                  <p className="text-xs text-stone-400 leading-relaxed pt-2 border-t border-stone-800">
                    {member.bio}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="py-16 px-6 sm:px-8 lg:px-16 bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-t border-emerald-900/40 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif text-white">Experience Untamed Wilderness Firsthand</h2>
            <p className="text-stone-300 text-sm">
              Book your villa today and enjoy curated game drives, farm-to-table dining, and direct wildlife views.
            </p>
            <div className="pt-4">
              <Link
                href="/book"
                className="inline-block px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs uppercase tracking-widest transition-colors shadow-xl"
              >
                Reserve Your Stay &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
