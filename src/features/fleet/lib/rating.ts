/**
 * Rating mathematics for the Safari Fleet module.
 *
 * Everything in this file is a pure function of its inputs so the numbers shown
 * on the dashboard can be reasoned about (and unit-checked) without a database.
 *
 * ---------------------------------------------------------------------------
 * WHY NOT A PLAIN AVERAGE
 * ---------------------------------------------------------------------------
 * Ranking by the arithmetic mean lets a vehicle with 5.00 from 2 reviews
 * outrank one with 4.80 from 150 reviews, which is statistically meaningless.
 * We therefore rank on a *confidence adjusted* score using the standard
 * Bayesian (a.k.a. "shrunk", or IMDb weighted-rating) estimator:
 *
 *      bayesian = (m * C + n * avg) / (m + n)
 *
 *   n   = number of reviews for this entity
 *   avg = this entity's arithmetic mean rating
 *   C   = the prior: the mean rating across the whole population of the same
 *         kind of entity (all rated vehicles, or all rated drivers)
 *   m   = prior weight, i.e. "how many reviews of evidence the prior is worth"
 *
 * Reading of the formula: a new entity starts at the fleet average C and is
 * pulled towards its own observed mean as reviews accumulate. With m = 10:
 *
 *   avg 5.00, n = 2,   C = 4.5  ->  (10*4.5 + 2*5.00) / 12 = 4.583
 *   avg 4.80, n = 150, C = 4.5  ->  (10*4.5 + 150*4.80) / 160 = 4.781
 *
 * ...so the well-evidenced 4.80 correctly outranks the thin 5.00, while a
 * genuinely excellent vehicle still climbs as its review count grows.
 *
 * m is a tuning knob, not a magic number: larger m = more scepticism about
 * small samples. 10 was chosen because a safari vehicle typically accumulates
 * ~10 reviews within a season, so a full season of evidence is enough to
 * roughly halve the pull of the prior.
 * ---------------------------------------------------------------------------
 */

/** Star scale bounds. Every rating field in `SafariReview` lives in here. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;

/** Prior weight `m` in the Bayesian estimator. See file header. */
export const BAYESIAN_PRIOR_WEIGHT = 10;

/**
 * Fallback prior `C` used when the population itself has no reviews yet
 * (the midpoint of the scale, i.e. maximally uninformative).
 */
export const BAYESIAN_FALLBACK_PRIOR = 3;

/** Below this many reviews we refuse to draw any conclusion at all. */
export const MIN_REVIEWS_FOR_INSIGHT = 5;

/** Below this many reviews a trend (recent vs. previous window) is not reported. */
export const MIN_REVIEWS_FOR_TREND = 6;

/** Largest comparison window used by {@link calculateTrend}. */
export const TREND_WINDOW_SIZE = 10;

/** A move of at least this many stars is called a trend rather than noise. */
export const TREND_SIGNIFICANCE = 0.15;

/** A drop of at least this many stars between windows is treated as a sudden drop. */
export const SUDDEN_DROP_THRESHOLD = 0.5;

/** Confidence-adjusted score at or below which an entity is flagged as low rated. */
export const LOW_RATING_THRESHOLD = 3.5;

/** A category this far below the entity's own overall mean counts as a weakness. */
export const CATEGORY_WEAKNESS_GAP = 0.5;

/** Absolute ceiling for a category to be reported as a weakness. */
export const CATEGORY_WEAKNESS_CEILING = 3.8;

export type TrendDirection = "IMPROVING" | "STABLE" | "DECLINING";

export interface TrendResult {
  /** Null when there is not enough data; callers must not invent a direction. */
  direction: TrendDirection | null;
  /** Mean of the most recent window. Null when not computable. */
  recentAverage: number | null;
  /** Mean of the window immediately before it. Null when not computable. */
  previousAverage: number | null;
  /** recentAverage - previousAverage. Null when not computable. */
  delta: number | null;
  /** Number of reviews in each comparison window. */
  windowSize: number;
  /** True when the fall between windows is large enough to page someone. */
  isSuddenDrop: boolean;
}

export interface CategoryWeakness {
  category: string;
  average: number;
  /** How far below the entity's own overall mean this category sits. */
  gap: number;
}

/** Rounds to 3 decimals, matching the `Decimal(4,3)` columns used for storage. */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Rounds to 2 decimals for display ("4.78"). */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Arithmetic mean of the supplied ratings, ignoring null/undefined entries
 * (optional categories such as "safari knowledge" are not always answered).
 * Returns null when there is nothing to average — never 0, which would read as
 * a terrible score rather than "no data".
 */
export function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length === 0) return null;
  const sum = present.reduce((acc, v) => acc + v, 0);
  return round3(sum / present.length);
}

/**
 * Confidence-adjusted score. See the file header for the derivation.
 *
 * @param count       number of reviews (n)
 * @param mean        arithmetic mean of those reviews (avg)
 * @param populationMean prior C — mean across all comparable entities
 * @param priorWeight prior weight m
 */
export function bayesianScore(
  count: number,
  mean: number | null,
  populationMean: number | null,
  priorWeight: number = BAYESIAN_PRIOR_WEIGHT
): number | null {
  if (count <= 0 || mean === null) return null;
  const prior =
    populationMean !== null && Number.isFinite(populationMean)
      ? populationMean
      : BAYESIAN_FALLBACK_PRIOR;
  return round3((priorWeight * prior + count * mean) / (priorWeight + count));
}

/**
 * Compares the most recent reviews against the ones immediately before them.
 *
 * `ratingsNewestFirst` must be ordered newest -> oldest. The window is
 * `min(TREND_WINDOW_SIZE, floor(n / 2))` so both windows are always the same
 * size and never overlap. With fewer than {@link MIN_REVIEWS_FOR_TREND}
 * reviews we return nulls: a two-point "trend" is noise, not a signal.
 */
export function calculateTrend(ratingsNewestFirst: number[]): TrendResult {
  const n = ratingsNewestFirst.length;
  const windowSize = Math.min(TREND_WINDOW_SIZE, Math.floor(n / 2));

  if (n < MIN_REVIEWS_FOR_TREND || windowSize < 2) {
    return {
      direction: null,
      recentAverage: null,
      previousAverage: null,
      delta: null,
      windowSize: 0,
      isSuddenDrop: false,
    };
  }

  const recent = average(ratingsNewestFirst.slice(0, windowSize));
  const previous = average(ratingsNewestFirst.slice(windowSize, windowSize * 2));

  if (recent === null || previous === null) {
    return {
      direction: null,
      recentAverage: recent,
      previousAverage: previous,
      delta: null,
      windowSize,
      isSuddenDrop: false,
    };
  }

  const delta = round3(recent - previous);
  let direction: TrendDirection = "STABLE";
  if (delta >= TREND_SIGNIFICANCE) direction = "IMPROVING";
  else if (delta <= -TREND_SIGNIFICANCE) direction = "DECLINING";

  return {
    direction,
    recentAverage: recent,
    previousAverage: previous,
    delta,
    windowSize,
    isSuddenDrop: delta <= -SUDDEN_DROP_THRESHOLD,
  };
}

/**
 * Finds the categories dragging an entity down: at least
 * {@link CATEGORY_WEAKNESS_GAP} below its own overall mean AND below
 * {@link CATEGORY_WEAKNESS_CEILING} in absolute terms. Both conditions matter —
 * a 4.6 "punctuality" under a 5.0 overall is not a problem worth flagging.
 *
 * Returns an empty list when the sample is too small to say anything.
 */
export function findCategoryWeaknesses(
  reviewCount: number,
  overallMean: number | null,
  categories: Record<string, number | null | undefined>
): CategoryWeakness[] {
  if (reviewCount < MIN_REVIEWS_FOR_INSIGHT || overallMean === null) return [];

  return Object.entries(categories)
    .filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === "number" && Number.isFinite(entry[1])
    )
    .map(([category, value]) => ({
      category,
      average: round2(value),
      gap: round2(overallMean - value),
    }))
    .filter((c) => c.gap >= CATEGORY_WEAKNESS_GAP && c.average < CATEGORY_WEAKNESS_CEILING)
    .sort((a, b) => b.gap - a.gap);
}

/**
 * True when an entity is well-evidenced enough to be called low rated.
 * Uses the confidence-adjusted score so a single angry review cannot flag a
 * vehicle that has otherwise performed well.
 */
export function isLowRated(reviewCount: number, bayesian: number | null): boolean {
  return (
    reviewCount >= MIN_REVIEWS_FOR_INSIGHT &&
    bayesian !== null &&
    bayesian <= LOW_RATING_THRESHOLD
  );
}

/** Formats a nullable score for display, e.g. "4.78" or "—". */
export function formatRating(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toFixed(2);
}
