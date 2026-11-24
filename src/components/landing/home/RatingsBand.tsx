import { Star } from "lucide-react";
import type { SiteContent } from "@/features/site/services/site.service";
import { SectionHeading } from "./SectionHeading";

/** Platform scores from Site Settings. Hidden when none are set. */
export function RatingsBand({ ratings, aggregate }: Pick<SiteContent, "ratings" | "aggregate">) {
  if (ratings.length === 0) return null;
  return (
    <section className="bg-[#f6f1e8] py-20 sm:py-24 px-5 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-4">
          <SectionHeading eyebrow="Guest ratings" title="What guests say">
            {aggregate && (
              <p>
                An average of <strong className="text-stone-900">{aggregate.value} out of 5</strong> across{" "}
                {aggregate.count} reviews on the sites our guests book through.
              </p>
            )}
          </SectionHeading>
        </div>
        <div className="lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ratings.map((r) => (
            <div key={r.platform} className="rounded-2xl bg-white p-6 text-center ring-1 ring-stone-900/5 shadow-sm">
              <p className="font-serif text-4xl text-stone-900">
                {r.score}
                <span className="text-base text-stone-400"> / {r.outOf}</span>
              </p>
              <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden /> {r.label}
              </p>
              <p className="mt-3 text-sm font-medium text-stone-800">{r.platform}</p>
              <p className="text-xs text-stone-500">{r.count} reviews</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
