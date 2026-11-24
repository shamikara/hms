"use server";

import { z } from "zod";
import { AuthService, EMAIL_NOT_CONFIRMED } from "../services/auth.service";
import { LoginSchema, LoginFormValues } from "../validations/auth.schema";
import { createSession, deleteSession } from "@/core/lib/session";
import {
  LOGIN_RULE,
  callerAddress,
  consumeRateLimit,
  describeWait,
  sweepExpiredRateLimits,
} from "@/core/security/rateLimit";
import { redirect } from "next/navigation";

/**
 * Messages the sign-in form is allowed to show.
 *
 * Anything else — a Prisma failure, a bad connection string — becomes the
 * generic message, because those name tables, columns and hosts.
 */
const SAFE_MESSAGES = new Set(["Invalid credentials.", "Account is disabled.", EMAIL_NOT_CONFIRMED]);
const GENERIC = "We could not sign you in just now. Please try again.";

/**
 * Where to go after signing in. Staff land in the admin panel, guests on
 * their account page. A `next` from the sign-in redirect is honoured only if
 * it is a path on this site the person can actually open: never an absolute
 * URL (an open redirect) and never /admin for a guest.
 */
function destinationFor(roles: string[], next?: string | null): string {
  const isStaff = roles.length > 0;
  const safe = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\");
  if (safe && (isStaff || !next.startsWith("/admin"))) return next;
  return isStaff ? "/admin/dashboard" : "/account";
}

export async function loginAction(data: LoginFormValues, next?: string | null) {
  let parsedData;
  try {
    parsedData = LoginSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues?.[0]?.message || GENERIC };
    }
    return { success: false, error: GENERIC };
  }

  // Two keys: the address stops one machine working through a list of
  // accounts, the address+account pair stops it working through a list of
  // passwords. Neither alone covers the other.
  const address = await callerAddress();
  for (const key of [
    `login:ip:${address}`,
    `login:account:${address}:${parsedData.email.toLowerCase()}`,
  ]) {
    const limit = await consumeRateLimit(key, LOGIN_RULE);
    if (!limit.allowed) {
      return {
        success: false,
        error: `Too many sign-in attempts. Please wait ${describeWait(limit.retryAfterSeconds)} and try again.`,
      };
    }
  }

  try {
    const user = await AuthService.login(parsedData);

    await createSession({ userId: user.id, role: user.role, roles: user.roles });

    return { success: true, user, redirectTo: destinationFor(user.roles, next) };
  } catch (error) {
    if (error instanceof Error && SAFE_MESSAGES.has(error.message)) {
      return { success: false, error: error.message, needsConfirmation: error.message === EMAIL_NOT_CONFIRMED };
    }
    console.error("loginAction failed:", error);
    return { success: false, error: GENERIC };
  } finally {
    // Cheap, and this is the lowest-traffic path that touches the table.
    void sweepExpiredRateLimits();
  }
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
