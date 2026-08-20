import Link from "next/link";
import { format } from "date-fns";
import { Compass, Info } from "lucide-react";
import { checkReviewEligibilityAction } from "@/features/fleet/actions/reviews.actions";
import { SafariReviewForm } from "@/features/fleet/components/SafariReviewForm";

export const dynamic = "force-dynamic";

/**
 * Guest review page.
 *
 * Eligibility is decided on the server: the signed-in user must own the guest
 * profile attached to this trip, the trip must be COMPLETED, and it must not
 * already have a review. Anything else renders an explanation, not a form.
 */
export default async function SafariReviewPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const result = await checkReviewEligibilityAction(tripId);

  if (!result.success) {
    return (
      <ReviewShell>
        <Notice
          title={
            result.code === "UNAUTHENTICATED"
              ? "Please sign in"
              : "We could not open this review"
          }
          message={result.error ?? "Please try again shortly."}
          showLogin={result.code === "UNAUTHENTICATED"}
        />
      </ReviewShell>
    );
  }

  const eligibility = result.data;

  if (!eligibility || !eligibility.eligible) {
    return (
      <ReviewShell>
        <Notice
          title="Review unavailable"
          message={eligibility?.reason ?? "This safari cannot be reviewed."}
        />
        {eligibility?.trip && (
          <p className="mt-4 text-center text-sm text-stone-500">
            {eligibility.trip.destination} ·{" "}
            {format(new Date(eligibility.trip.scheduledStart), "d MMMM yyyy")}
          </p>
        )}
      </ReviewShell>
    );
  }

  return (
    <ReviewShell>
      <SafariReviewForm
        trip={eligibility.trip!}
        askDriverKnowledge={eligibility.trip!.guideName === null}
      />
    </ReviewShell>
  );
}

function ReviewShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-50 py-12 dark:bg-stone-950">
      <div className="mx-auto w-full max-w-2xl px-4">{children}</div>
    </main>
  );
}

function Notice({
  title,
  message,
  showLogin = false,
}: {
  title: string;
  message: string;
  showLogin?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center dark:border-stone-800 dark:bg-stone-900">
      <Compass className="mx-auto h-8 w-8 text-emerald-600" />
      <h1 className="mt-4 font-serif text-2xl text-stone-900 dark:text-white">{title}</h1>
      <p className="mt-2 flex items-center justify-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Info className="h-3.5 w-3.5" />
        {message}
      </p>
      {showLogin && (
        <Link
          href="/login"
          className="mt-6 inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}
