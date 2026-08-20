import prisma from "@/core/db/prisma";
import { verifySession } from "@/core/lib/session";
import { Logger } from "@/core/logging/Logger";

/**
 * Authorization for the Safari Fleet module.
 *
 * Builds on the existing pieces rather than replacing them:
 *   - identity comes from `verifySession()` (the jose JWT cookie),
 *   - roles come from the existing `RoleAssignment -> PropertyAssignment ->
 *     Employee` chain in the schema, with the JWT role claim as a fallback.
 *
 * `src/shared/middleware/permissions.ts` is left untouched: it is a stub used
 * by nothing, and rewriting it is outside this change.
 */

const logger = new Logger("FleetAuthz");

export type FleetPermission =
  /** Read fleet data (lists, dashboards, vehicle/driver detail). */
  | "fleet:view"
  /** Create/update vehicles, drivers, maintenance, documents, fuel logs. */
  | "fleet:manage"
  /** Assign vehicles/drivers, start and complete trips. */
  | "fleet:dispatch"
  /** See cost and spend figures. */
  | "fleet:cost";

const ALL: FleetPermission[] = ["fleet:view", "fleet:manage", "fleet:dispatch", "fleet:cost"];

/**
 * Role -> permission map. Role names match the strings already used in this
 * codebase (`Role.name`, and the `roles` arrays in navigation.config.ts).
 * Unknown roles get nothing.
 */
const ROLE_PERMISSIONS: Record<string, FleetPermission[]> = {
  SUPER_ADMIN: ALL,
  GENERAL_MANAGER: ALL,
  RESORT_MANAGER: ALL,
  FLEET_MANAGER: ALL,
  SAFARI_COORDINATOR: ["fleet:view", "fleet:dispatch"],
  RANGER: ["fleet:view"],
  GUIDE: ["fleet:view"],
  DRIVER: ["fleet:view"],
  FINANCE_OFFICER: ["fleet:view", "fleet:cost"],
  RECEPTIONIST: ["fleet:view"],
};

export interface FleetActor {
  userId: string;
  /** Null when the signed-in user has no Employee record (e.g. a guest login). */
  employeeId: string | null;
  organizationId: string | null;
  /** Property ids the actor is assigned to. Empty for org-level/stub sessions. */
  propertyIds: string[];
  roles: string[];
  permissions: FleetPermission[];
}

export class AuthzError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "FORBIDDEN"
  ) {
    super(message);
    this.name = "AuthzError";
  }
}

function permissionsForRoles(roles: string[]): FleetPermission[] {
  const granted = new Set<FleetPermission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return [...granted];
}

/**
 * Resolves the signed-in actor and their effective fleet permissions.
 * Throws {@link AuthzError} when there is no session.
 *
 * Role precedence: the database is authoritative. When the user's employee
 * record carries role assignments, only those count — the role claim in the
 * session cookie is a *fallback* for installs that have not seeded
 * `Role`/`RoleAssignment` rows yet, and for when the database is unreachable.
 *
 * This matters because `AuthService.login` currently issues the same role claim
 * to every user; letting that claim win over a real assignment would make the
 * database roles decorative.
 */
export async function getFleetActor(): Promise<FleetActor> {
  const session = await verifySession();
  if (!session?.userId) {
    throw new AuthzError("You must be signed in.", "UNAUTHENTICATED");
  }

  const dbRoles = new Set<string>();

  let employeeId: string | null = null;
  let organizationId: string | null = null;
  const propertyIds: string[] = [];

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: session.userId },
      select: {
        id: true,
        organizationId: true,
        assignments: {
          select: {
            propertyId: true,
            roles: { select: { role: { select: { name: true } } } },
          },
        },
      },
    });

    if (employee) {
      employeeId = employee.id;
      organizationId = employee.organizationId;
      for (const assignment of employee.assignments) {
        propertyIds.push(assignment.propertyId);
        for (const roleAssignment of assignment.roles) {
          dbRoles.add(roleAssignment.role.name);
        }
      }
    }
  } catch (error) {
    logger.warn("Could not resolve employee roles; falling back to session role", {
      userId: session.userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Fall back to the session claim only when the database told us nothing.
  const roleList =
    dbRoles.size > 0 ? [...dbRoles] : session.role ? [session.role] : [];
  return {
    userId: session.userId,
    employeeId,
    organizationId,
    propertyIds,
    roles: roleList,
    permissions: permissionsForRoles(roleList),
  };
}

/**
 * Resolves the actor and asserts a permission. Use this at the top of every
 * fleet server action — server actions are reachable by direct POST, so the
 * check has to live in the action, not only in the page that renders it.
 */
export async function requireFleetPermission(
  permission: FleetPermission
): Promise<FleetActor> {
  const actor = await getFleetActor();
  if (!actor.permissions.includes(permission)) {
    throw new AuthzError(
      `Your role does not allow this action (${permission} required).`,
      "FORBIDDEN"
    );
  }
  return actor;
}

/**
 * Resolves the `GuestProfile` of the signed-in user. Used by the review flow:
 * a review may only be submitted by the guest attached to the trip, so we need
 * their profile id, not just their user id.
 */
export async function getGuestProfileForSession(): Promise<{
  userId: string;
  guestProfileId: string;
} | null> {
  const session = await verifySession();
  if (!session?.userId) return null;

  const profile = await prisma.guestProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true },
  });

  if (!profile) return null;
  return { userId: session.userId, guestProfileId: profile.id };
}
