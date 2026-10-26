/**
 * The short booking reference a guest is given and the desk searches by.
 *
 * A cuid is 25 characters and unreadable over the phone. The last eight are
 * the counter and random portion, so they vary between rows created in the
 * same millisecond; the leading characters are the timestamp and would collide
 * constantly.
 *
 * Shortening is for display only — it is not unique by construction, so
 * lookups still go by the full id and this is only ever matched against.
 */
export function toBookingReference(id: string): string {
  return id.slice(-8).toUpperCase();
}
