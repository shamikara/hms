import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { Utensils, Coffee, Clock } from "lucide-react";
import { getSiteContent } from "@/features/site/services/site.service";
import { getTodaysMenu } from "@/features/menu/services/menu.service";
import { TodaysMenu } from "@/features/menu/components/TodaysMenu";
import { getMediaContent } from "@/features/media/services/media.service";

// Today's menu changes daily and on every save; re-check at least every 10 min.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Food & Breakfast",
  description:
    "A small restaurant on site cooking fresh Sri Lankan meals to order, and continental breakfast served between 7:30am and 10:00am.",
  alternates: { canonical: "/dining" },
  openGraph: {
    title: "Food & Breakfast",
    description:
      "A small restaurant on site cooking fresh Sri Lankan meals to order, and continental breakfast served between 7:30am and 10:00am.",
    url: "/dining",
  },
};

export default async function DiningPage() {
  const [{ contact }, menu, media] = await Promise.all([getSiteContent(), getTodaysMenu(), getMediaContent()]);
  // Chosen in Admin > Photos; an empty list hides the photo wall.
  const kitchenPhotos = media.foodPhotos;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 selection:bg-emerald-800 selection:text-stone-100">
      <BreadcrumbJsonLd trail={[{ name: "Home", path: "/" }, { name: "Dining", path: "/dining" }]} />
      <PublicHeader variant="solid" />

      {/* Hero Banner */}
      <section className="relative h-[65vh] flex items-center justify-center overflow-hidden border-b border-stone-850">
        <Image
          src="/food/food-hero-breakfast-pool.webp"
          alt="Breakfast served at a table beside the pool"
          fill
          priority
          className="object-cover brightness-[0.4] scale-105 transition-transform duration-1000"
        />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto space-y-4">
          <ScrollReveal direction="down" delay={0.1}>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold bg-emerald-950/80 px-4 py-1.5 rounded-full border border-emerald-700/50">
              Food &amp; Breakfast
            </span>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.2}>
            <h1 className="text-4xl sm:text-6xl font-serif text-white tracking-tight">
              Cooked to Order
            </h1>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={0.3}>
            <p className="text-stone-300 max-w-2xl mx-auto text-base sm:text-lg font-light leading-relaxed">
              There is a restaurant on site and the kitchen cooks fresh Sri Lankan meals to order.
              Guests single out the food more than anything else in their reviews.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* The two things we actually serve */}
      <section className="py-20 px-6 sm:px-12 lg:px-24 bg-stone-900 border-b border-stone-850">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Utensils className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-white">Sri Lankan Meals</h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Rice and curry and other Sri Lankan dishes, cooked fresh when you order rather than held
              on a buffet. Tell the team what you like and roughly when you want to eat, and they will
              work around it.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <Coffee className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-serif text-white">Breakfast</h2>
            <p className="text-stone-400 text-sm leading-relaxed">
              Continental breakfast is served between 7:30am and 10:00am. It is charged separately
              rather than being included in the room rate — worth knowing when you compare us with
              other places.
            </p>
            <p className="text-xs font-mono text-stone-500 flex items-center gap-2 pt-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              7:30am &ndash; 10:00am
            </p>
          </div>
        </div>
      </section>

      {/* Real dishes from the kitchen */}
      {kitchenPhotos.length > 0 && (
      <section className="py-20 px-6 sm:px-12 lg:px-24 border-b border-stone-850">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-3 mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 block">From Our Kitchen</span>
            <h2 className="text-3xl sm:text-4xl font-serif text-white">What Guests Sit Down To</h2>
            <p className="text-stone-400 text-sm max-w-xl mx-auto">
              Photographed at the house, not styled for a brochure. What is cooking changes day to day; see
              today&apos;s menu below.
            </p>
          </div>
          <div className="columns-2 md:columns-3 gap-4 [column-fill:_balance]">
            {kitchenPhotos.map((photo, i) => (
              <ScrollReveal key={photo.src} direction="up" delay={0.05 * (i % 3)}>
                <figure className="group relative mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-stone-800 bg-stone-900">
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    width={photo.width}
                    height={photo.height}
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
                  />
                  {photo.caption && (
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pt-10 pb-3 text-sm text-white">
                      {photo.caption}
                    </figcaption>
                  )}
                </figure>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      )}

      <TodaysMenu menu={menu} whatsapp={contact.phone} />

      {/* Early starts */}
      <section className="py-20 px-6 sm:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative h-[320px] sm:h-[420px] rounded-2xl overflow-hidden border border-stone-800 shadow-2xl">
            <Image
              src="/food/food-tea-garden.webp"
              alt="Tea served at a table overlooking the garden and pool"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          <div className="space-y-6">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 block">
              If You Are Going on Safari
            </span>
            <h2 className="text-3xl font-serif text-white">Leaving Before Breakfast</h2>
            <p className="text-stone-300 text-base leading-relaxed">
              Morning drives into Udawalawe leave well before the kitchen opens. If you are booked on
              one, say so the night before and the team will sort something out for you rather than
              letting you leave on an empty stomach.
            </p>
            <p className="text-stone-400 text-sm leading-relaxed">
              Anything else about food — allergies, children, what time you want dinner — is easiest
              to settle directly.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-700 text-white rounded-full text-xs font-mono uppercase tracking-wider transition-colors shadow-lg"
              >
                <Utensils className="w-4 h-4" />
                <span>Ask the Kitchen</span>
              </Link>
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center px-6 py-3 border border-stone-700 hover:border-emerald-600 text-stone-300 hover:text-emerald-400 rounded-full text-xs font-mono uppercase tracking-wider transition-colors"
              >
                {contact.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
