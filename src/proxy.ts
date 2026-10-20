import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Route guard for the operations area.
 *
 * Runs ahead of the app at the network boundary, so it verifies the session
 * JWT only and never touches Prisma. Pages and server actions still perform
 * their own authorisation (see features/fleet/lib/authz.ts and
 * features/admin/lib/requireAdminSession.ts) — this is the outer gate that
 * stops unauthenticated requests reaching them at all, not a substitute for
 * those checks.
 *
 * Uses the `proxy` file convention; `middleware` is deprecated in this
 * version of Next.
 */

/** Needs a signed-in user of any kind — guests included. */
const SIGNED_IN_PREFIXES = ["/safari/review"];

/** Needs a signed-in user holding a staff role. */
const STAFF_PREFIXES = ["/admin"];

/**
 * Roles permitted into the operations area. GUEST is deliberately absent:
 * guests sign in to rate their safari drives, and must not reach /admin.
 */
const STAFF_ROLES = new Set([
  "SUPER_ADMIN",
  "GENERAL_MANAGER",
  "RESORT_MANAGER",
  "FLEET_MANAGER",
  "SAFARI_COORDINATOR",
  "FINANCE_OFFICER",
  "RECEPTIONIST",
  "RANGER",
  "GUIDE",
  "DRIVER",
]);

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

async function readSession(
  request: NextRequest,
): Promise<{ userId: string; role: string } | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || payload.userId.length === 0) return null;
    return {
      userId: payload.userId,
      role: typeof payload.role === "string" ? payload.role : "",
    };
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return null;
  }
}

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const needsStaff = matches(pathname, STAFF_PREFIXES);
  const needsSignIn = needsStaff || matches(pathname, SIGNED_IN_PREFIXES);
  if (!needsSignIn) return NextResponse.next();

  const session = await readSession(request);

  if (session && (!needsStaff || STAFF_ROLES.has(session.role))) {
    return NextResponse.next();
  }

  // A signed-in guest who wandered into /admin is sent home rather than to a
  // login form they have already satisfied.
  const target = session
    ? new URL("/", request.url)
    : new URL("/login", request.url);
  if (!session) target.searchParams.set("next", `${pathname}${search}`);

  const response = NextResponse.redirect(target);
  // Belt and braces: never let a protected URL be cached or indexed.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  /*
   * Everything except Next internals, the metadata routes and static files.
   * The matcher is deliberately broad; PROTECTED_PREFIXES decides what is
   * actually gated, so adding a protected area is a one-line change.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:webp|png|jpg|jpeg|gif|svg|ico|woff2?)$).*)",
  ],
};
