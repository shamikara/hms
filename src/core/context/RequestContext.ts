export interface RequestContext {
  userId: string;
  organizationId: string;
  propertyId?: string; // Nullable if the action is Organization-wide
}

/**
 * Ensures that the required multi-tenant context is present.
 */
export function validateContext(context: RequestContext, requireProperty = true): void {
  if (!context.organizationId) {
    throw new Error('Missing organization context');
  }
  if (requireProperty && !context.propertyId) {
    throw new Error('Missing property context');
  }
}
