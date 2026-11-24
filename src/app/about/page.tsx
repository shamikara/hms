import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Home, Waves, Utensils, Compass } from "lucide-react";
import { getSiteContent } from "@/features/site/services/site.service";
import { getPublicRooms } from "@/features/rooms/services/public-rooms.service";

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** "three" for prose; digits once the words stop reading naturally. */
function inWords(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "A, B and C" */
function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const metadata: Metadata = {
  title: "About the Resort",
  description: "A small guesthouse beside Udawalawe National Park, and the people who run it.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About the Resort",
    description: "A small guesthouse beside Udawalawe National Park, and the people who run it.",
    url: "/about",
  },
};

/** Rebuilt at least this often even if no admin change triggers it. */
export const revalidate = 3600;

export default async function AboutPage() {
  const [{ aggregate }, rooms] = await Promise.all([getSiteContent(), getPublicRooms()]);

  // Counts and room names come from the admin panel, so a room taken off sale
  // for renovation, or a new one added, changes this page too. If the rooms
  // could not be read, the page keeps to wording that does not need a number.
  const roomCount = rooms?.totalSellableRooms ?? 0;
  const roomsPhrase = roomCount > 0 ? `${inWords(roomCount)} air-conditioned rooms` : "Air-conditioned rooms";
  const roomTypesText =
    rooms && rooms.roomTypes.length > 0
      ? `${listOf(rooms.roomTypes.map((t) => t.name))}. All air-conditioned, all with private bathrooms. Small enough that the team knows who you are by the second morning.`
      : "All air-conditioned, all with private bathrooms. Small enough that the team knows who you are by the second morning.";

  /** What the house actually offers, as listed on the booking platforms. */
  const pillars = [
    {
      icon: Home,
      title: roomCount > 0 ? `${capitalise(inWords(roomCount))} ${roomCount === 1 ? "Room" : "Rooms"}` : "The Rooms",
      description: roomTypesText,
    },
    {
      icon: Waves,
      title: "The Pool",
      description:
        "An outdoor pool in the garden with loungers under a pergola. It is the thing guests mention most after the food, and it is a good place to be in the hours the park is shut.",
    },
    {
      icon: Utensils,
      title: "Food Cooked to Order",
      description:
        "A restaurant on site cooking fresh Sri Lankan meals rather than holding a buffet. Continental breakfast is served between 7:30am and 10:00am and is charged separately.",
    },
    {
      icon: Compass,
      title: "Safari Arranged for You",
      description:
        "The house books jeeps and drivers into Udawalawe National Park for a morning or afternoon drive. The drivers are independent operators we work with regularly.",
    },
  ];

  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex flex-col">
      <BreadcrumbJsonLd trail={[{ name: "Home", path: "/" }, { name: "About", path: "/about" }]} />
      <PublicHeader variant="solid" />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="relative py-24 px-6 sm:px-8 lg:px-16 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 border-b border-stone-850 overflow-hidden">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <ScrollReveal delay={0.1}>
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs sm:text-sm font-mono block">
                About the House
              </span>
            </ScrollReveal>
            <ScrollReveal delay={0.2}>
              <h1 className="text-4xl sm:text-6xl font-serif tracking-tight text-white leading-tight">
                A Small Guesthouse by the Park
              </h1>
            </ScrollReveal>
            <ScrollReveal delay={0.3}>
              <p className="text-stone-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                {capitalise(roomsPhrase)}, an outdoor pool and a kitchen that cooks to order, a
                short drive from the Udawalawe National Park entrance.
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* Narrative & History */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <ScrollReveal direction="right">
            <div className="space-y-6">
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                What We Are
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white leading-tight">
                Small, and Not Pretending Otherwise
              </h2>
              <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
                This is a small guesthouse, not a resort with a wing. What that buys you is
                a team that can be flexible about dinner times and early safari starts, and what it
                costs you is the things a large hotel has — there is no spa, no gym and no second
                restaurant.
              </p>
              <p className="text-stone-400 text-sm leading-relaxed">
                The front desk is staffed from 7:00am to 7:00pm, the team speak English, and
                housekeeping is available on request. Free Wi-Fi throughout and free private parking
                on site.
              </p>

              <div className="pt-4 grid grid-cols-2 gap-6 border-t border-stone-850">
                {roomCount > 0 && (
                  <div>
                    <span className="text-3xl font-serif text-emerald-400 block">{roomCount}</span>
                    <span className="text-xs text-stone-400 font-mono">Guest Rooms</span>
                  </div>
                )}
                {aggregate && (
                  <div>
                    <span className="text-3xl font-serif text-emerald-400 block">{aggregate.value}</span>
                    <span className="text-xs text-stone-400 font-mono">
                      Average Across {aggregate.count} Platform Reviews
                    </span>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="left">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-stone-800 h-[450px]">
              <Image
                src="/property-verandah-dusk.webp"
                alt="Lily Safari Resort Sanctuary"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl">
                <span className="text-emerald-400 text-xs font-mono font-medium block">Udawalawa, Sabaragamuwa Province</span>
                <p className="text-xs text-stone-300 mt-1">A short drive from the national park entrance.</p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Core Pillars */}
        <section className="py-20 px-6 sm:px-8 lg:px-16 bg-stone-900/60 border-y border-stone-850">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono block">
                What You Get
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-white">
                The Four Things We Do
              </h2>
              <p className="text-stone-400 text-sm">
                A short list, honestly described, rather than a long one you would have to check.
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

        {/* Call to Action Banner */}
        <section className="py-16 px-6 sm:px-8 lg:px-16 bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-950 border-t border-emerald-900/40 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-serif text-white">Come and Stay</h2>
            <p className="text-stone-300 text-sm">
              Send us your dates and we will tell you what is free and what it costs.
            </p>
            <div className="pt-4">
              <Link
                href="/book"
                className="inline-block px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs uppercase tracking-widest transition-colors shadow-xl"
              >
                Check Availability &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
