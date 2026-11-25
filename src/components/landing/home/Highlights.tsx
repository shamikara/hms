import { Car, Flame, Utensils, Waves } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { HOME, type HomeDict } from "@/lib/i18n/home";
import { SectionHeading } from "./SectionHeading";

const ICONS = [Car, Waves, Utensils, Flame];

/** Why stay here: four reasons, plainly put. */
export function Highlights({ t = HOME.en.highlights }: { t?: HomeDict["highlights"] }) {
  return (
    <section className="bg-stone-900 py-20 sm:py-28 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <ScrollReveal className="lg:col-span-4">
          <SectionHeading eyebrow={t.eyebrow} title={t.title}>
            <p>{t.intro}</p>
          </SectionHeading>
        </ScrollReveal>

        <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4 sm:gap-5">
          {t.items.map((item, i) => {
            const Icon = ICONS[i] ?? Car;
            return (
              <ScrollReveal key={item.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl bg-stone-950 p-6 sm:p-7 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)] ring-1 ring-white/10">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-400">{item.text}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
