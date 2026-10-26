import { verifySession } from "@/core/lib/session";
import prisma from "@/core/db/prisma";
import { resolveActorFromDb } from "@/core/authz/actor";

/**
 * Authorisation for the admin server actions.
 *
 * Server actions are POST endpoints that can be invoked from any route, so the
 * proxy gate on /admin is not sufficient on its own — each action authorises
 * itself. Crucially that means checking the caller's *role*, not merely that
 * they are signed in: guests sign in too (to rate a safari drive), and a
 * signed-in-is-enough check handed them the whole guest list.
 *
 * Mirrors features/fleet/lib/authz.ts, and reads roles through the same
 * resolver so the two cannot drift apart.
 */

export type AdminPermission =
  /** Reach the operations area at all. */
  | "admin:access"
  /** Read reservations and arrivals. */
  | "reservations:view"
  /** Change reservation state: confirm, check in, check out, cancel. */
  | "reservations:manage"
  /** Read guest CRM records (names, contact details, stay history). */
  | "guests:view"
  /** See revenue, invoices and payment figures. */
  | "finance:view";

const ALL: AdminPermission[] = [
  "admin:access",
  "reservations:view",
  "reservations:manage",
  "guests:view",
  "finance:view",
];

/**
 * Role -> permission map. Role names match `Role.name` and the role strings
 * already used in navigation.config.ts. Unknown roles get nothing.
 *
 * The safari field roles (DRIVER, RANGER, GUIDE) are deliberately absent: they
 * work out of the fleet module, which grants them its own permissions, and
 * have no business reading guest contact details or revenue.
 */
const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  SUPER_ADMIN: ALL,
  GENERAL_MANAGER: ALL,
  RESORT_MANAGER: ALL,
  FINANCE_OFFICER: ["admin:access", "finance:view", "reservations:view", "guests:view"],
  RECEPTIONIST: ["admin:access", "reservations:view", "reservations:manage", "guests:view"],
  SAFARI_COORDINATOR: ["admin:access", "reservations:view", "guests:view"],
};

export interface AdminActor {
  userId: string;
  employeeId: string | null;
  organizationId: string | null;
  propertyIds: string[];
  roles: string[];
  permissions: AdminPermission[];
}

/** The failure payload admin actions return when there is no session. */
export const UNAUTHENTICATED = {
  success: false as const,
  error: "You must be signed in to view this.",
};

/** The failure payload admin actions return when the role is insufficient. */
export const FORBIDDEN = {
  success: false as const,
  error: "Your role does not allow this.",
};

/** Shown when the install has no property row yet. */
export const NO_PROPERTY =
  "No property is configured yet. Run the seed to create one.";

export type AdminGuard =
  | { ok: true; actor: AdminActor }
  | { ok: false; failure: typeof UNAUTHENTICATED | typeof FORBIDDEN };

function permissionsForRoles(roles: string[]): AdminPermission[] {
  const granted = new Set<AdminPermission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return [...granted];
}

/**
 * Resolves the signed-in actor and their effective admin permissions.
 * Returns null when there is no valid session.
 *
 * Role precedence matches the fleet module: the database is authoritative, and
 * the session cookie's role claim is consulted only when the database could
 * not be reached. A user the database says holds no roles holds none — that is
 * an answer, not a gap to paper over with the claim.
 */
export async function getAdminActor(): Promise<AdminActor | null> {
  const session = await verifySession();
  if (!session?.userId) return null;

  const resolved = await resolveActorFromDb(session.userId);

  const roles = resolved.resolved ? resolved.roles : session.roles;

  return {
    userId: session.userId,
    employeeId: resolved.employeeId,
    organizationId: resolved.organizationId,
    propertyIds: resolved.propertyIds,
    roles,
    permissions: permissionsForRoles(roles),
  };
}

/**
 * Guard for the top of every admin server action.
 *
 * Returns the actor, or the failure payload the action should return as-is, so
 * an unauthorised caller sees the same shape as an empty result and learns
 * nothing about what exists behind the check.
 */
export async function requireAdminPermission(
  permission: AdminPermission,
): Promise<AdminGuard> {
  const actor = await getAdminActor();
  if (!actor) return { ok: false, failure: UNAUTHENTICATED };
  if (!actor.permissions.includes(permission)) {
    return { ok: false, failure: FORBIDDEN };
  }
  return { ok: true, actor };
}

/**
 * The property an admin screen operates on when none is specified.
 *
 * There is no active-property selector on the server yet — PropertySwitcher is
 * presentational — so the oldest property is used, which is correct for a
 * single-property install.
 */
export async function resolveDefaultPropertyId(): Promise<string | null> {
  const property = await prisma.property.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return property?.id ?? null;
}
