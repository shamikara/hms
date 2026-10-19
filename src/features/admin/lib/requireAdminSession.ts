import { verifySession } from "@/core/lib/session";

/**
 * Guard for the admin server actions.
 *
 * Server actions are POST endpoints that can be invoked from any route, so
 * the middleware gate on /admin is not sufficient on its own — each action
 * verifies the session itself.
 *
 * Returns the session, or null when there isn't a valid one. Callers return
 * their normal failure shape rather than throwing, so an unauthenticated
 * request is indistinguishable from an empty result to the caller.
 */
export async function requireAdminSession() {
  return verifySession();
}

/** The failure payload admin actions return when there is no session. */
export const UNAUTHENTICATED = {
  success: false as const,
  error: "You must be signed in to view this.",
};
