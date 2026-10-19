import { Star } from "lucide-react";

/**
 * Aggregate guest ratings as published by each booking platform.
 * Scores only — no review text is reproduced here.
 */
const ratings = [
  { platform: "Booking.com", score: "8.9", outOf: "10", count: 39, label: "Fabulous" },
  { platform: "Google", score: "4.7", outOf: "5", count: 126, label: "Excellent" },
  { platform: "Hotels.com", score: "9.1", outOf: "10", count: 45, label: "Wonderful" },
  { platform: "Expedia", score: "9.2", outOf: "10", count: 38, label: "Wonderful" },
];

export function GuestReviews() {
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
