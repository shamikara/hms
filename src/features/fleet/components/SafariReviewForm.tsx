"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Compass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError, StarInput, TextArea } from "./FleetFormControls";
import { submitSafariReviewAction } from "../actions/reviews.actions";
import type { ReviewableTrip } from "../services/review.service";

/**
 * Guest review form.
 *
 * Reachable only from a trip the signed-in guest actually travelled on; the
 * server re-checks that the trip is COMPLETED, belongs to this guest, and has
 * not been reviewed before.
 */

interface SafariReviewFormProps {
  trip: ReviewableTrip;
  /** True when the driver also acted as the guide, so the knowledge question applies. */
  askDriverKnowledge: boolean;
}

type Ratings = {
  overallRating: number | null;
  driverOverall: number | null;
  driverSafety: number | null;
  driverPunctuality: number | null;
  driverProfessionalism: number | null;
  driverCommunication: number | null;
  driverKnowledge: number | null;
  vehicleOverall: number | null;
  vehicleCleanliness: number | null;
  vehicleComfort: number | null;
  vehicleCondition: number | null;
  vehicleRideQuality: number | null;
  vehicleSuitability: number | null;
};

const emptyRatings: Ratings = {
  overallRating: null,
  driverOverall: null,
  driverSafety: null,
  driverPunctuality: null,
  driverProfessionalism: null,
  driverCommunication: null,
  driverKnowledge: null,
  vehicleOverall: null,
  vehicleCleanliness: null,
  vehicleComfort: null,
  vehicleCondition: null,
  vehicleRideQuality: null,
  vehicleSuitability: null,
};

/** Every rating except the optional safari-knowledge one. */
const REQUIRED_KEYS: Array<keyof Ratings> = [
  "overallRating",
  "driverOverall",
  "driverSafety",
  "driverPunctuality",
  "driverProfessionalism",
  "driverCommunication",
  "vehicleOverall",
  "vehicleCleanliness",
  "vehicleComfort",
  "vehicleCondition",
  "vehicleRideQuality",
  "vehicleSuitability",
];

export function SafariReviewForm({ trip, askDriverKnowledge }: SafariReviewFormProps) {
  const router = useRouter();
  const [ratings, setRatings] = React.useState<Ratings>(emptyRatings);
  const [comment, setComment] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  function set(key: keyof Ratings, value: number) {
    setRatings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const missing = REQUIRED_KEYS.filter((key) => ratings[key] === null);
    if (missing.length > 0) {
      setError("Please rate every category before submitting.");
      return;
    }

    setPending(true);
    const result = await submitSafariReviewAction({
      tripId: trip.id,
      comment,
      ...ratings,
      driverKnowledge: ratings.driverKnowledge ?? undefined,
    });
    setPending(false);

    if (!result.success) {
      setError(result.error ?? "Could not submit your review.");
      return;
    }

    setSubmitted(true);
    router.refresh();
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900/50 dark:bg-emerald-950/40">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <h2 className="mt-4 font-serif text-xl text-emerald-900 dark:text-emerald-200">
          Thank you for your review
        </h2>
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
          Your feedback goes straight to the team looking after {trip.driver.name} and{" "}
          {trip.vehicle.displayName ?? trip.vehicle.plateNumber}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Compass className="h-4 w-4" />
          <span className="text-[10px] font-mono uppercase tracking-wider">
            Your safari
          </span>
        </div>
        <h1 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">
          {trip.destination}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {format(new Date(trip.scheduledStart), "EEEE d MMMM yyyy, HH:mm")} · Driver{" "}
          {trip.driver.name} · Vehicle{" "}
          {trip.vehicle.displayName ?? trip.vehicle.plateNumber}
          {trip.guideName && ` · Guide ${trip.guideName}`}
        </p>
      </div>

      <FormError message={error} />

      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-serif text-lg text-stone-900 dark:text-white">
          Overall experience
        </h2>
        <div className="mt-2">
          <StarInput
            name="overallRating"
            label="How was the safari overall?"
            required
            value={ratings.overallRating}
            onChange={(v) => set("overallRating", v)}
          />
        </div>
        <div className="mt-4">
          <label className="block space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Anything you would like to tell us?
            </span>
            <TextArea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="What made the drive memorable, and anything we could do better…"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-serif text-lg text-stone-900 dark:text-white">
          Your driver — {trip.driver.name}
        </h2>
        <div className="mt-2">
          <StarInput
            name="driverOverall"
            label="Overall"
            required
            value={ratings.driverOverall}
            onChange={(v) => set("driverOverall", v)}
          />
          <StarInput
            name="driverSafety"
            label="Driving safety"
            required
            value={ratings.driverSafety}
            onChange={(v) => set("driverSafety", v)}
          />
          <StarInput
            name="driverPunctuality"
            label="Punctuality"
            required
            value={ratings.driverPunctuality}
            onChange={(v) => set("driverPunctuality", v)}
          />
          <StarInput
            name="driverProfessionalism"
            label="Professionalism and courtesy"
            required
            value={ratings.driverProfessionalism}
            onChange={(v) => set("driverProfessionalism", v)}
          />
          <StarInput
            name="driverCommunication"
            label="Communication"
            required
            value={ratings.driverCommunication}
            onChange={(v) => set("driverCommunication", v)}
          />
          {askDriverKnowledge && (
            <StarInput
              name="driverKnowledge"
              label="Wildlife and safari knowledge (optional)"
              value={ratings.driverKnowledge}
              onChange={(v) => set("driverKnowledge", v)}
            />
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-serif text-lg text-stone-900 dark:text-white">
          Your vehicle — {trip.vehicle.displayName ?? trip.vehicle.plateNumber}
        </h2>
        <div className="mt-2">
          <StarInput
            name="vehicleOverall"
            label="Overall"
            required
            value={ratings.vehicleOverall}
            onChange={(v) => set("vehicleOverall", v)}
          />
          <StarInput
            name="vehicleCleanliness"
            label="Cleanliness"
            required
            value={ratings.vehicleCleanliness}
            onChange={(v) => set("vehicleCleanliness", v)}
          />
          <StarInput
            name="vehicleComfort"
            label="Comfort"
            required
            value={ratings.vehicleComfort}
            onChange={(v) => set("vehicleComfort", v)}
          />
          <StarInput
            name="vehicleCondition"
            label="Vehicle condition"
            required
            value={ratings.vehicleCondition}
            onChange={(v) => set("vehicleCondition", v)}
          />
          <StarInput
            name="vehicleRideQuality"
            label="Ride quality"
            required
            value={ratings.vehicleRideQuality}
            onChange={(v) => set("vehicleRideQuality", v)}
          />
          <StarInput
            name="vehicleSuitability"
            label="Suitability for safari"
            required
            value={ratings.vehicleSuitability}
            onChange={(v) => set("vehicleSuitability", v)}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? "Submitting…" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}
