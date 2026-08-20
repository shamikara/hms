/**
 * Fuel efficiency and operating-cost mathematics.
 *
 * Rule followed throughout: **never invent consumption data**. Every function
 * returns null (not zero, not an estimate) when the records are insufficient,
 * and reports how many records it used so the UI can say "based on 4 fill-ups".
 *
 * Method: the standard "tank to tank" calculation. Distance is taken from the
 * odometer readings on the fill-up records, and the fuel counted is every
 * fill-up *except the first* — the first tank's litres were burned before the
 * measured window began, so including them understates efficiency.
 *
 *      distance = mileage(last) - mileage(first)
 *      litres   = sum(litres of logs 2..n)
 *      km/L     = distance / litres
 */

export interface FuelLogPoint {
  /** Odometer reading at the fill-up, in km. */
  mileage: number;
  /** Litres dispensed. */
  litres: number;
  /** Total paid, in the property's currency. */
  cost: number;
  loggedAt: Date;
}

export interface FuelEfficiencyResult {
  /** Average kilometres per litre. Null when not computable. */
  kmPerLitre: number | null;
  /** Fuel cost per kilometre. Null when not computable. */
  fuelCostPerKm: number | null;
  /** Distance covered across the measured window, in km. Null when not computable. */
  distanceKm: number | null;
  /** Litres counted (i.e. excluding the first fill-up). */
  litresCounted: number | null;
  /** Money spent on the counted litres. */
  fuelSpend: number | null;
  /** How many fill-up records the numbers are based on. */
  sampleSize: number;
  /** Why the result is null, for display. Empty when a result was produced. */
  insufficientDataReason: string;
}

/** Minimum fill-ups needed before efficiency can be calculated at all. */
export const MIN_FUEL_LOGS_FOR_EFFICIENCY = 2;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Computes fuel efficiency from a set of fill-up records. Input order does not
 * matter; the records are sorted by odometer reading internally.
 */
export function calculateFuelEfficiency(logs: FuelLogPoint[]): FuelEfficiencyResult {
  const empty: FuelEfficiencyResult = {
    kmPerLitre: null,
    fuelCostPerKm: null,
    distanceKm: null,
    litresCounted: null,
    fuelSpend: null,
    sampleSize: logs.length,
    insufficientDataReason: "",
  };

  if (logs.length < MIN_FUEL_LOGS_FOR_EFFICIENCY) {
    return {
      ...empty,
      insufficientDataReason: `Needs at least ${MIN_FUEL_LOGS_FOR_EFFICIENCY} fuel records; have ${logs.length}`,
    };
  }

  const ordered = [...logs].sort((a, b) => a.mileage - b.mileage);
  const distanceKm = ordered[ordered.length - 1].mileage - ordered[0].mileage;

  if (distanceKm <= 0) {
    return {
      ...empty,
      insufficientDataReason: "Odometer readings do not advance between fuel records",
    };
  }

  // Skip the first record: its litres were consumed before the measured window.
  const counted = ordered.slice(1);
  const litresCounted = counted.reduce((sum, l) => sum + l.litres, 0);
  const fuelSpend = counted.reduce((sum, l) => sum + l.cost, 0);

  if (litresCounted <= 0) {
    return {
      ...empty,
      distanceKm,
      insufficientDataReason: "No fuel volume recorded after the first fill-up",
    };
  }

  return {
    kmPerLitre: round2(distanceKm / litresCounted),
    fuelCostPerKm: round3(fuelSpend / distanceKm),
    distanceKm,
    litresCounted: round2(litresCounted),
    fuelSpend: round2(fuelSpend),
    sampleSize: ordered.length,
    insufficientDataReason: "",
  };
}

export interface OperatingCostResult {
  fuelCost: number;
  maintenanceCost: number;
  totalCost: number;
  /** Distance from completed trips, in km. */
  distanceKm: number;
  /** Total cost per kilometre. Null when no distance has been logged. */
  costPerKm: number | null;
  insufficientDataReason: string;
}

/**
 * Total operating cost per kilometre. Distance comes from completed trips
 * (`SafariTrip.distanceKm`) rather than the odometer, so a mid-period odometer
 * correction cannot silently deflate the figure.
 */
export function calculateOperatingCost(
  fuelCost: number,
  maintenanceCost: number,
  distanceKm: number
): OperatingCostResult {
  const totalCost = round2(fuelCost + maintenanceCost);
  if (distanceKm <= 0) {
    return {
      fuelCost: round2(fuelCost),
      maintenanceCost: round2(maintenanceCost),
      totalCost,
      distanceKm: 0,
      costPerKm: null,
      insufficientDataReason: "No completed trip distance recorded for this period",
    };
  }
  return {
    fuelCost: round2(fuelCost),
    maintenanceCost: round2(maintenanceCost),
    totalCost,
    distanceKm,
    costPerKm: round3(totalCost / distanceKm),
    insufficientDataReason: "",
  };
}

export interface FuelCostTrendPoint {
  /** Month bucket in `YYYY-MM` form. */
  period: string;
  litres: number;
  cost: number;
  /** Cost per litre for the period. Null when no litres were recorded. */
  costPerLitre: number | null;
}

/**
 * Buckets fuel spend by calendar month so the dashboard can show a real trend
 * line. Months with no records are simply absent — gaps are not filled with
 * zeroes, which would draw a misleading cliff.
 */
export function buildFuelCostTrend(logs: FuelLogPoint[]): FuelCostTrendPoint[] {
  const buckets = new Map<string, { litres: number; cost: number }>();

  for (const log of logs) {
    const period = `${log.loggedAt.getUTCFullYear()}-${String(
      log.loggedAt.getUTCMonth() + 1
    ).padStart(2, "0")}`;
    const bucket = buckets.get(period) ?? { litres: 0, cost: 0 };
    bucket.litres += log.litres;
    bucket.cost += log.cost;
    buckets.set(period, bucket);
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, b]) => ({
      period,
      litres: round2(b.litres),
      cost: round2(b.cost),
      costPerLitre: b.litres > 0 ? round2(b.cost / b.litres) : null,
    }));
}
