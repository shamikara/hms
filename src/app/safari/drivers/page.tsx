import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Star, Compass, ShieldCheck, Clock, MessageSquare, UserRound } from "lucide-react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { FleetUnavailable } from "@/features/fleet/components/FleetUnavailable";
import {
  DriverRepository,
  type PublicDriverRow,
} from "@/features/fleet/repositories/driver.repository";
import { MIN_REVIEWS_FOR_INSIGHT, formatRating } from "@/features/fleet/lib/rating";

export const metadata: Metadata = {
  title: "Our Safari Drivers",
  description:
    "Meet the drivers who take our guests into Udawalawe National Park, with ratings left by guests who have actually travelled with them.",
};

export const dynamic = "force-dynamic";

/** Decimal columns arrive as Prisma Decimal; normalise for display. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function Stars({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="text-xs text-stone-500 font-mono">Not yet rated</span>;
  }
  return (
    <span className="flex items-center gap-0.5" aria-label={`${formatRating(value)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={`h-3.5 w-3.5 ${
            i <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "fill-stone-700 text-stone-700"
          }`}
        />
      ))}
    </span>
  );
}

function CategoryBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 shrink-0 text-[11px] text-stone-400">{label}</span>
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-stone-800">
        <span
          className="block h-full rounded-full bg-emerald-500"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right text-[11px] font-mono text-stone-300">
        {formatRating(value)}
      </span>
    </div>
  );
}

function DriverCard({ driver }: { driver: PublicDriverRow }) {
  const name = `${driver.employee.firstName} ${driver.employee.lastName}`.trim();
  const avg = toNumber(driver.ratingAvg);
  const count = driver.ratingCount;
  const wellEvidenced = count >= MIN_REVIEWS_FOR_INSIGHT;

  return (
    <article className="flex flex-col rounded-2xl border border-stone-800 bg-stone-900/40 p-5 transition-colors hover:border-stone-700 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-stone-700 bg-stone-800 sm:h-20 sm:w-20">
          {driver.imageUrl ? (
            <Image src={driver.imageUrl} alt={name} fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-stone-600">
              <UserRound className="h-7 w-7" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg text-white sm:text-xl">{name}</h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stars value={avg} />
            {avg !== null && (
              <span className="text-xs font-mono text-stone-400">
                {formatRating(avg)} · {count} {count === 1 ? "review" : "reviews"}
              </span>
            )}
          </div>

          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-stone-400">
            <span className="flex items-center gap-1">
              <Compass className="h-3.5 w-3.5 text-emerald-400" />
              {driver.safariExperienceYears}{" "}
              {driver.safariExperienceYears === 1 ? "year" : "years"} driving safaris
            </span>
            <span
              className={`flex items-center gap-1 ${
                driver.isAvailable ? "text-emerald-400" : "text-stone-500"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {driver.isAvailable ? "Available" : "Not currently taking drives"}
            </span>
          </p>
        </div>
      </div>

      {/* Category breakdown, only once there is enough evidence to mean anything. */}
      {wellEvidenced && (
        <div className="mt-5 space-y-1.5 border-t border-stone-800 pt-4">
          <CategoryBar label="Safety" value={toNumber(driver.ratingSafetyAvg)} />
          <CategoryBar label="Punctuality" value={toNumber(driver.ratingPunctualityAvg)} />
          <CategoryBar label="Professionalism" value={toNumber(driver.ratingProfessionalismAvg)} />
          <CategoryBar label="Communication" value={toNumber(driver.ratingCommunicationAvg)} />
          <CategoryBar label="Park knowledge" value={toNumber(driver.ratingKnowledgeAvg)} />
        </div>
      )}

      {count > 0 && !wellEvidenced && (
        <p className="mt-4 border-t border-stone-800 pt-4 text-[11px] text-stone-500">
          Too few reviews so far to break the score down by category.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={`/book?driver=${driver.id}`}
          aria-disabled={!driver.isAvailable}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors ${
            driver.isAvailable
              ? "bg-emerald-700 text-white hover:bg-emerald-600"
              : "pointer-events-none bg-stone-800 text-stone-500"
          }`}
        >
          {driver.isAvailable ? "Request this driver" : "Unavailable"}
        </Link>
        <Link
          href="/contact"
          className="flex min-h-11 items-center justify-center rounded-xl border border-stone-700 px-4 text-sm text-stone-300 transition-colors hover:border-emerald-600 hover:text-emerald-300"
        >
          Ask about them
        </Link>
      </div>
    </article>
  );
}

export default async function SafariDriversPage() {
  let drivers: PublicDriverRow[] | null = null;
  let error: string | null = null;

  try {
    drivers = await DriverRepository.listPublic();
  } catch {
    // Matches the fleet module's rule: say why, never invent a roster.
    error = "We could not load the driver list just now. Please try again shortly.";
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-950 font-sans text-stone-100 selection:bg-emerald-200 selection:text-emerald-900">
      <PublicHeader variant="solid" />

      <main className="flex-1">
        <section className="border-b border-stone-850 bg-gradient-to-b from-stone-900 via-stone-950 to-stone-950 px-5 py-16 text-center sm:px-8 sm:py-24 lg:px-16">
          <ScrollReveal delay={0.1}>
            <span className="font-mono text-xs font-medium uppercase tracking-widest text-emerald-400">
              Your safari, your driver
            </span>
          </ScrollReveal>
          <ScrollReveal delay={0.2}>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-white sm:text-5xl">
              Meet the Drivers
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={0.3}>
            <p className="mx-auto mt-4 max-w-xl text-sm text-stone-400 sm:text-base">
              Every drive into Udawalawe is arranged by the resort, and you can
              ask for the driver you want. The ratings below come only from
              guests who have actually travelled with them.
            </p>
          </ScrollReveal>
        </section>

        <section className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16 lg:px-16">
          {error ? (
            <FleetUnavailable title="Drivers unavailable" message={error} />
          ) : drivers && drivers.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {drivers.map((driver) => (
                  <DriverCard key={driver.id} driver={driver} />
                ))}
              </div>

              <div className="mt-10 flex flex-col items-start gap-3 rounded-2xl border border-stone-800 bg-stone-900/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Travelled with one of them?
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      Ratings can only be left for a drive you actually took, which
                      is what keeps these scores worth reading.
                    </p>
                  </div>
                </div>
                <Link
                  href="/safari/review"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-600 sm:w-auto"
                >
                  <MessageSquare className="h-4 w-4" />
                  Rate your drive
                </Link>
              </div>
            </>
          ) : (
            <FleetUnavailable
              title="No drivers listed yet"
              message="The driver roster has not been published yet. The team can still arrange a safari for you — just get in touch."
            />
          )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
