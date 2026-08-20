import Link from "next/link";
import { format } from "date-fns";
import { Compass, Star } from "lucide-react";
import { listMyReviewableTripsAction } from "@/features/fleet/actions/reviews.actions";

export const dynamic = "force-dynamic";

/**
 * "My safaris" — the guest's own completed drives, with a link to review the
 * ones that have not been reviewed yet. This is the only route into the review
 * form, which is why there is no public "rate this driver" page anywhere.
 */
export default async function MySafarisPage() {
  const result = await listMyReviewableTripsAction();

  return (
    <main className="min-h-screen bg-stone-50 py-12 dark:bg-stone-950">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Compass className="h-4 w-4" />
          <span className="text-[10px] font-mono uppercase tracking-wider">
            Your safaris
          </span>
        </div>
        <h1 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">
          Rate your game drives
        </h1>
        <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
          Your feedback on the driver and the vehicle goes directly to the team who look
          after them.
        </p>

        <div className="mt-8 space-y-3">
          {!result.success ? (
            <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm text-stone-600 dark:text-stone-400">{result.error}</p>
              {result.code === "UNAUTHENTICATED" && (
                <Link
                  href="/login"
                  className="mt-4 inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Sign in
                </Link>
              )}
            </div>
          ) : result.data && result.data.trips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm text-stone-500 dark:text-stone-400">
                You do not have any completed safaris to review yet.
              </p>
            </div>
          ) : (
            result.data?.trips.map((trip) => (
              <div
                key={trip.id}
                className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="font-serif text-lg text-stone-900 dark:text-white">
                    {trip.destination}
                  </h2>
                  <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {format(new Date(trip.scheduledStart), "EEEE d MMMM yyyy")} · Driver{" "}
                    {trip.driver.name} ·{" "}
                    {trip.vehicle.displayName ?? trip.vehicle.plateNumber}
                  </p>
                </div>
                {trip.hasReview ? (
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    Reviewed
                  </span>
                ) : (
                  <Link
                    href={`/safari/review/${trip.id}`}
                    className="inline-flex shrink-0 items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Leave a review
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
