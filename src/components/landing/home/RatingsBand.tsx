import { Star } from "lucide-react";
import type { SiteContent } from "@/features/site/services/site.service";
import { SectionHeading } from "./SectionHeading";
import { HOME, fill, type HomeDict } from "@/lib/i18n/home";
import { Rich } from "@/lib/i18n/Rich";

/** Platform scores from Site Settings. Hidden when none are set. */
export function RatingsBand({
  ratings,
  aggregate,
  t = HOME.en.ratings,
}: Pick<SiteContent, "ratings" | "aggregate"> & { t?: HomeDict["ratings"] }) {
  if (ratings.length === 0) return null;
  return (
    <section className="bg-stone-900 py-20 sm:py-24 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow={t.eyebrow} title={t.title}>
            {aggregate && (
              <p>
                <Rich text={fill(t.average, { value: aggregate.value, count: aggregate.count })} boldClassName="text-white" />
              </p>
            )}
          </SectionHeading>
        </div>
        <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ratings.map((r) => (
            <div key={r.platform} className="rounded-2xl bg-stone-950 p-6 text-center ring-1 ring-white/10 shadow-sm">
              <p className="font-serif text-4xl text-white">
                {r.score}
                <span className="text-base text-stone-400"> / {r.outOf}</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden /> {r.label}
              </p>
              <p className="mt-3 text-sm font-medium text-stone-100">{r.platform}</p>
              <p className="text-xs text-stone-500">{r.count} {t.reviews}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
