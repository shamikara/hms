import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Binoculars, Clock, Truck } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeading } from "./SectionHeading";
import { HOME, type HomeDict } from "@/lib/i18n/home";

const ICONS = [Truck, Clock, Binoculars];

/** The safari, told with the house's own jeeps and the park's elephants. */
export function SafariFeature({ t = HOME.en.safari }: { t?: HomeDict["safari"] }) {
  const POINTS = t.points.map((text, i) => ({ icon: ICONS[i] ?? Truck, text }));
  return (
    <section className="relative overflow-hidden bg-[#13291f] py-20 sm:py-28 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <ScrollReveal>
          <SectionHeading eyebrow={t.eyebrow} title={t.title} tone="dark">
            <p>{t.intro}</p>
          </SectionHeading>
          <ul className="mt-8 space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-stone-200">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                  <p.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="pt-1">{p.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/safari"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-stone-900 hover:bg-emerald-50 transition-colors"
            >
              {t.drives} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/safari/drivers"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {t.drivers}
            </Link>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-emerald-200 hover:text-white transition-colors"
            >
              {t.guide}
            </Link>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-5 grid-rows-2 gap-3 sm:gap-4 h-[460px] sm:h-[560px]">
            <figure className="relative col-span-3 row-span-2 overflow-hidden rounded-3xl">
              <Image src="/safari-elephant-grass.webp" alt="A wild elephant grazing in Udawalawe" fill sizes="(max-width: 1024px) 60vw, 30vw" className="object-cover" />
            </figure>
            <figure className="relative col-span-2 overflow-hidden rounded-3xl">
              <Image src="/safari-jeep-lakeside.webp" alt="One of the house safari jeeps by the reservoir" fill sizes="(max-width: 1024px) 40vw, 20vw" className="object-cover" />
            </figure>
            <figure className="relative col-span-2 overflow-hidden rounded-3xl">
              <Image src="/wildlife-bee-eater.webp" alt="A bee-eater perched on a branch" fill sizes="(max-width: 1024px) 40vw, 20vw" className="object-cover" />
            </figure>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
