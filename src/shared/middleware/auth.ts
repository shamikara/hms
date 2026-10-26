import { RequestContext } from '@/core/context/RequestContext';

/**
 * Unimplemented session decoder.
 *
 * NOT IN USE. `core/lib/session.ts` already decodes the signed cookie with
 * jose; `verifySession()` is the real entry point.
 *
 * This previously returned `mock-user-id` / `mock-org-id`, which any caller
 * would have treated as a genuine identity. Refusing is the safe stub.
 */
export async function getSessionContext(): Promise<RequestContext> {
  throw new Error(
    'getSessionContext is not implemented. Use verifySession() from ' +
      'core/lib/session.ts, or getAdminActor()/getFleetActor() when roles are needed.',
  );
}
