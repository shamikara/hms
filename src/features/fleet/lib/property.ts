import prisma from "@/core/db/prisma";
import { AppError } from "@/core/types/Result";
import type { FleetActor } from "./authz";

/**
 * Resolves which property a fleet page or action is operating on.
 *
 * This codebase has no property-selection state on the server yet — the
 * `PropertySwitcher` component is presentational — so the rule is:
 *   1. an explicitly requested property, if the actor is assigned to it
 *      (or is an org-wide role with no assignments recorded);
 *   2. otherwise the actor's first assigned property;
 *   3. otherwise the oldest property in the database (single-property installs
 *      and demo data).
 *
 * Wiring a real active-property selector is out of scope for this change; when
 * one exists, only this function needs to read it.
 */
export async function resolveActivePropertyId(
  actor: FleetActor,
  requestedPropertyId?: string
): Promise<string> {
  if (requestedPropertyId) {
    const permitted =
      actor.propertyIds.length === 0 || actor.propertyIds.includes(requestedPropertyId);
    if (!permitted) {
      throw new AppError(
        "FORBIDDEN",
        "You are not assigned to that property."
      );
    }
    return requestedPropertyId;
  }

  if (actor.propertyIds.length > 0) return actor.propertyIds[0];

  const property = await prisma.property.findFirst({
    where: { deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!property) {
    throw new AppError(
      "NO_PROPERTY",
      "No property is configured yet. Create a property before using fleet operations."
    );
  }

  return property.id;
}

/** Property display context used in page headers. */
export async function getPropertyContext(propertyId: string) {
  return prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, name: true, timezone: true, baseCurrency: true },
  });
}
