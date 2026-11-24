import { Star } from "lucide-react";
import { getSiteContent } from "@/features/site/services/site.service";

/**
 * Aggregate guest ratings as published by each booking platform, as entered
 * in Site Settings. Scores only — no review text is reproduced here.
 */


export async function GuestReviews() {
  const { ratings } = await getSiteContent();
  if (ratings.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-14 space-y-2">
        <span className="text-emerald-400 font-medium tracking-widest uppercase text-xs font-mono">
          What Guests Say
        </span>
        <h2 className="text-3xl sm:text-4xl font-serif text-white">Guest Ratings</h2>
        <p className="text-stone-400 text-sm max-w-xl mx-auto pt-2">
          Scores published by the platforms our guests book through.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 justify-center gap-4 sm:gap-6">
        {ratings.map((r) => (
          <div
            key={r.platform}
            className="bg-stone-900/50 border border-stone-800 rounded-2xl p-6 text-center space-y-2 hover:border-stone-700 transition-colors"
          >
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-serif text-emerald-400">{r.score}</span>
              <span className="text-xs text-stone-500 font-mono">/ {r.outOf}</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-emerald-400">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="text-xs font-medium text-stone-200">{r.label}</span>
            </div>
            <div className="pt-1 space-y-0.5">
              <p className="text-sm text-stone-200 font-medium">{r.platform}</p>
              <p className="text-[11px] text-stone-500 font-mono">{r.count} reviews</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
