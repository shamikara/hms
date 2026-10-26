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

/**
 * Front-of-house and management roles: everything in the operations area that
 * is not carved out below.
 */
const OPERATIONS_ROLES = [
  "SUPER_ADMIN",
  "GENERAL_MANAGER",
  "RESORT_MANAGER",
  "FINANCE_OFFICER",
  "RECEPTIONIST",
  "SAFARI_COORDINATOR",
];

/**
 * Role rules for the operations area, matched most specific first.
 *
 * The safari field roles reach the fleet screens and nothing else: a driver
 * has no business in the guest CRM or the revenue ledger. Finance is narrower
 * again. Previously a single STAFF_ROLES set let every role, DRIVER included,
 * into all of /admin.
 *
 * This is the outer gate only — it reads the signed cookie and never touches
 * the database. The server actions behind these pages authorise themselves
 * against the database (features/admin/lib/requireAdminSession.ts and
 * features/fleet/lib/authz.ts), which is what actually protects the data.
 */
const ROLE_RULES: ReadonlyArray<{ prefix: string; roles: readonly string[] }> = [
  {
    prefix: "/admin/safari/fleet",
    roles: [...OPERATIONS_ROLES, "FLEET_MANAGER", "RANGER", "GUIDE", "DRIVER"],
  },
  {
    prefix: "/admin/finance",
    roles: ["SUPER_ADMIN", "GENERAL_MANAGER", "RESORT_MANAGER", "FINANCE_OFFICER"],
  },
  { prefix: "/admin", roles: OPERATIONS_ROLES },
];

async function readSession(
  request: NextRequest,
): Promise<{ userId: string; roles: string[] } | null> {
  const token = request.cookies.get("session")?.value;
  if (!token) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // Encoding undefined gives a zero-length key, which jose rejects with a
    // message that never mentions the missing variable. Say it plainly.
    console.error(
      "SESSION_SECRET is not set; every session will be rejected. " +
        "Set it in the hosting platform's environment variables.",
    );
    return null;
  }

  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || payload.userId.length === 0) return null;
    // `roles` is absent from cookies issued before it was added; fall back to
    // the single claim so existing sessions are not all logged out at once.
    const roles = Array.isArray(payload.roles)
      ? payload.roles.filter((r): r is string => typeof r === "string")
      : typeof payload.role === "string" && payload.role
        ? [payload.role]
        : [];
    return { userId: payload.userId, roles };
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

  const rule = ROLE_RULES.find((r) => matches(pathname, [r.prefix]));
  const needsSignIn = Boolean(rule) || matches(pathname, SIGNED_IN_PREFIXES);
  if (!needsSignIn) return NextResponse.next();

  const session = await readSession(request);

  const allowed =
    session && (!rule || session.roles.some((role) => rule.roles.includes(role)));
  if (allowed) {
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
   * The matcher is deliberately broad; ROLE_RULES decides what is
   * actually gated, so adding a protected area is a one-line change.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:webp|png|jpg|jpeg|gif|svg|ico|woff2?)$).*)",
  ],
};
