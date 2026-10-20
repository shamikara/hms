import { verifySession } from "@/core/lib/session";
import prisma from "@/core/db/prisma";

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

/**
 * The property an admin screen operates on when none is specified.
 *
 * There is no active-property selector on the server yet — PropertySwitcher is
 * presentational — so the oldest property is used, which is correct for a
 * single-property install. Previously these actions filtered on the literal
 * string "resort_1", which matches no row, so every count came back zero and
 * was masked by a hardcoded fallback.
 */
/** Shown when the install has no property row yet. */
export const NO_PROPERTY =
  "No property is configured yet. Run the seed to create one.";

export async function resolveDefaultPropertyId(): Promise<string | null> {
  const property = await prisma.property.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return property?.id ?? null;
}
