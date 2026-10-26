/**
 * Role given to an authenticated user who has no employee record — a guest.
 * It is deliberately absent from the fleet permission map, so it grants
 * nothing in the operations area.
 */
export const GUEST_ROLE = "GUEST";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Primary role, kept for the session claim. */
  role: string;
  /** Every role the user holds; empty for guests. */
  roles: string[];
}

export interface SessionPayload {
  userId: string;
  /** Primary role. Kept for display and for cookies issued before `roles`. */
  role: string;
  /**
   * Every role the user holds. The proxy gates on this: someone who is both a
   * DRIVER and a RECEPTIONIST must not be judged on whichever one happened to
   * sort first.
   */
  roles?: string[];
  expiresAt: Date;
}
