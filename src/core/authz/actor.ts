import prisma from "@/core/db/prisma";
import { Logger } from "@/core/logging/Logger";

const logger = new Logger("Authz");

/**
 * Who a signed-in user is, as far as the database is concerned.
 *
 * Roles come from the `RoleAssignment -> PropertyAssignment -> Employee`
 * chain. A user with no employee record — a guest — resolves to no roles at
 * all, which is the correct answer rather than a missing one.
 */
export interface ResolvedActor {
  /** Null when the signed-in user has no Employee record (e.g. a guest login). */
  employeeId: string | null;
  organizationId: string | null;
  /** Property ids the actor is assigned to. Empty for guests. */
  propertyIds: string[];
  roles: string[];
  /**
   * True when the lookup actually reached the database. False means the roles
   * array is empty because the query failed, not because the user holds none —
   * callers that fall back to the session claim need to tell those apart.
   */
  resolved: boolean;
}

/**
 * Resolves a user's employee record and effective role names.
 *
 * Shared by the admin and fleet authorisation layers so that both read roles
 * the same way; a divergence between them is a privilege bug waiting to
 * happen. Never throws: a database failure returns `resolved: false` and lets
 * the caller decide how cautious to be.
 */
export async function resolveActorFromDb(userId: string): Promise<ResolvedActor> {
  const roles = new Set<string>();
  const propertyIds: string[] = [];
  let employeeId: string | null = null;
  let organizationId: string | null = null;

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId },
      select: {
        id: true,
        organizationId: true,
        deletedAt: true,
        assignments: {
          select: {
            propertyId: true,
            roles: { select: { role: { select: { name: true } } } },
          },
        },
      },
    });

    // A terminated employee keeps their row but must keep none of their access.
    if (employee && !employee.deletedAt) {
      employeeId = employee.id;
      organizationId = employee.organizationId;
      for (const assignment of employee.assignments) {
        propertyIds.push(assignment.propertyId);
        for (const roleAssignment of assignment.roles) {
          roles.add(roleAssignment.role.name);
        }
      }
    }

    return { employeeId, organizationId, propertyIds, roles: [...roles], resolved: true };
  } catch (error) {
    logger.warn("Could not resolve employee roles from the database", {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { employeeId: null, organizationId: null, propertyIds: [], roles: [], resolved: false };
  }
}
