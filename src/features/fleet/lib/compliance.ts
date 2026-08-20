/**
 * Derived compliance state for vehicle documents, driver licences and service
 * schedules.
 *
 * These states are deliberately *not* stored in the database: a stored
 * "EXPIRING_SOON" flag is wrong the moment the clock moves past it and requires
 * a cron job to stay honest. Deriving from `expiryDate` at read time can never
 * go stale.
 */

/** Days before expiry at which a document starts warning. */
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

/** Days before expiry at which a driver licence starts warning. */
export const LICENSE_EXPIRY_WARNING_DAYS = 45;

/** Days before the next service date at which a vehicle is "due". */
export const SERVICE_DUE_WARNING_DAYS = 14;

/** Kilometres before the next service odometer target at which a vehicle is "due". */
export const SERVICE_DUE_WARNING_KM = 500;

export type ValidityStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export type ServiceDueStatus = "OK" | "DUE_SOON" | "OVERDUE" | "UNKNOWN";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from `now` until `date`. Negative once the date has passed. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.floor((date.getTime() - now.getTime()) / MS_PER_DAY);
}

/**
 * Validity of anything with an expiry date (insurance, revenue licence,
 * emission certificate, driver licence, ...).
 */
export function validityStatus(
  expiryDate: Date,
  warningDays: number = DOCUMENT_EXPIRY_WARNING_DAYS,
  now: Date = new Date()
): ValidityStatus {
  const days = daysUntil(expiryDate, now);
  if (days < 0) return "EXPIRED";
  if (days <= warningDays) return "EXPIRING_SOON";
  return "VALID";
}

export interface ServiceDueInput {
  /** Next scheduled service date, if the last job booked one. */
  nextServiceDate: Date | null;
  /** Odometer target for the next service, if the last job set one. */
  nextServiceMileage: number | null;
  /** The vehicle's current odometer reading. */
  currentMileage: number;
}

export interface ServiceDueResult {
  status: ServiceDueStatus;
  /** Days until the next service date. Null when no date was scheduled. */
  daysRemaining: number | null;
  /** Kilometres until the next service odometer target. Null when none was set. */
  kmRemaining: number | null;
  /** Human readable reason, empty when status is OK/UNKNOWN. */
  reason: string;
}

/**
 * Combines the date-based and mileage-based service triggers. Whichever
 * trigger is more urgent wins, because a vehicle that has driven past its
 * service mileage is due even if its service date is months away.
 *
 * Returns UNKNOWN — not OK — when neither trigger was ever set, so the UI can
 * say "no service schedule recorded" instead of implying the vehicle is fine.
 */
export function serviceDueStatus(
  input: ServiceDueInput,
  now: Date = new Date()
): ServiceDueResult {
  const daysRemaining =
    input.nextServiceDate !== null ? daysUntil(input.nextServiceDate, now) : null;
  const kmRemaining =
    input.nextServiceMileage !== null
      ? input.nextServiceMileage - input.currentMileage
      : null;

  if (daysRemaining === null && kmRemaining === null) {
    return { status: "UNKNOWN", daysRemaining, kmRemaining, reason: "" };
  }

  if (daysRemaining !== null && daysRemaining < 0) {
    return {
      status: "OVERDUE",
      daysRemaining,
      kmRemaining,
      reason: `Service overdue by ${Math.abs(daysRemaining)} day(s)`,
    };
  }

  if (kmRemaining !== null && kmRemaining < 0) {
    return {
      status: "OVERDUE",
      daysRemaining,
      kmRemaining,
      reason: `Service overdue by ${Math.abs(kmRemaining)} km`,
    };
  }

  if (daysRemaining !== null && daysRemaining <= SERVICE_DUE_WARNING_DAYS) {
    return {
      status: "DUE_SOON",
      daysRemaining,
      kmRemaining,
      reason: `Service due in ${daysRemaining} day(s)`,
    };
  }

  if (kmRemaining !== null && kmRemaining <= SERVICE_DUE_WARNING_KM) {
    return {
      status: "DUE_SOON",
      daysRemaining,
      kmRemaining,
      reason: `Service due in ${kmRemaining} km`,
    };
  }

  return { status: "OK", daysRemaining, kmRemaining, reason: "" };
}
