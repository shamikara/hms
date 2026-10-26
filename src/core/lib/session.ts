import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { SessionPayload } from "@/features/auth/types";

/**
 * Signing key for the session cookie.
 *
 * Resolved lazily so an unset variable surfaces as a readable error at the
 * point of use rather than crashing module load. Encoding `undefined` yields
 * a zero-length key, and jose then fails with "Zero-length key is not
 * supported" — which says nothing about the actual cause.
 */
function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Sessions cannot be signed without it. " +
        "Set it in the hosting platform's environment variables — a local " +
        ".env file is not deployed.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(sessionKey());
}

export async function decrypt(session: string | undefined = "") {
  // Resolved outside the try: a missing secret is a deployment fault and must
  // surface, whereas a bad token is ordinary and returns null.
  const key = sessionKey();
  try {
    const { payload } = await jwtVerify(session, key, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ ...payload, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get("session")?.value;
  const session = await decrypt(cookie);

  if (!session?.userId) {
    return null;
  }

  return {
    isAuth: true,
    userId: session.userId,
    role: session.role,
    roles: session.roles ?? (session.role ? [session.role] : []),
  };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
