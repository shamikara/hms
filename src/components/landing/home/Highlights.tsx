import { Car, Flame, Utensils, Waves } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeading } from "./SectionHeading";

const HIGHLIGHTS = [
  {
    icon: Car,
    title: "Close to the park",
    text: "A short drive to the Udawalawe National Park entrance, so a dawn safari is an early start, not a long one.",
  },
  {
    icon: Waves,
    title: "A pool in the garden",
    text: "Loungers under the trees for the hot middle of the day, and lit up after dark.",
  },
  {
    icon: Utensils,
    title: "Home-cooked food",
    text: "Sri Lankan rice and curry, grills and breakfast on the verandah, cooked to order.",
  },
  {
    icon: Flame,
    title: "Evenings by the fire",
    text: "A campfire and string lights in the garden once the jeeps are back.",
  },
];

/** Why stay here: four reasons, plainly put. */
export function Highlights() {
  return (
    <section className="bg-stone-900 py-20 sm:py-28 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        <ScrollReveal className="lg:col-span-4">
          <SectionHeading eyebrow="Why stay with us" title="Small, friendly and right by the park">
            <p>
              A family-run guesthouse with a handful of rooms, where the team knows your name by the
              second morning.
            </p>
          </SectionHeading>
        </ScrollReveal>

        <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4 sm:gap-5">
          {HIGHLIGHTS.map((item, i) => (
            <ScrollReveal key={item.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl bg-stone-950 p-6 sm:p-7 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_8px_24px_-12px_rgba(28,25,23,0.12)] ring-1 ring-white/10">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950 text-emerald-400">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-400">{item.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
