import { RequestContext } from '@/core/context/RequestContext';

/**
 * Unimplemented RBAC check.
 *
 * NOT IN USE. The working authorisation lives in
 * `features/admin/lib/requireAdminSession.ts` and `features/fleet/lib/authz.ts`,
 * both of which resolve roles from the database. Use one of those.
 *
 * This previously ended in `return true`, so anything that adopted it would
 * have authorised every caller while reading as though it checked something.
 * It now refuses instead: a stub that fails closed is a bug, a stub that
 * fails open is a breach.
 */
export async function requirePermission(_context: RequestContext, _requiredRole: string): Promise<boolean> {
  throw new Error(
    'requirePermission is not implemented. Use requireAdminPermission ' +
      '(features/admin/lib/requireAdminSession.ts) or requireFleetPermission ' +
      '(features/fleet/lib/authz.ts), which check roles against the database.',
  );
}
