import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionHeading } from "./SectionHeading";

/** The table and the garden after dark: what a day here ends with. */
export function FoodAndEvenings() {
  return (
    <section className="bg-stone-900 py-20 sm:py-28 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <ScrollReveal className="lg:order-2">
          <SectionHeading eyebrow="Food & evenings" title="Rice and curry, then the fire">
            <p>
              Breakfast on the verandah and dinners of Sri Lankan rice and curry or grills, cooked to
              order. After dark the pool lights up and
              there is a fire in the garden.
            </p>
          </SectionHeading>
          <Link
            href="/dining"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 hover:text-emerald-300 transition-colors"
          >
            Food at the house <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>

        <ScrollReveal delay={0.1} className="lg:order-1">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <figure className="relative aspect-[3/4] overflow-hidden rounded-3xl">
              <Image src="/dining-rice-curry.webp" alt="Sri Lankan rice and curry" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
            </figure>
            <div className="grid gap-3 sm:gap-4">
              <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl">
                <Image src="/pool-night-lit.webp" alt="The pool lit up at night" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
              </figure>
              <figure className="relative aspect-[4/3] overflow-hidden rounded-3xl">
                <Image src="/garden-night-rain.webp" alt="The garden under string lights after dark" fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover" />
              </figure>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
