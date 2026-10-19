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

const PROTECTED_PREFIXES = ["/admin", "/safari/review"];

const key = new TextEncoder().encode(process.env.SESSION_SECRET);

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("session")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.userId === "string" && payload.userId.length > 0;
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  if (await hasValidSession(request)) return NextResponse.next();

  // Send them to sign in, remembering where they were headed.
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);

  const response = NextResponse.redirect(loginUrl);
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
