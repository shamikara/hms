import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import prisma from "@/core/db/prisma";

/** A refusal the person should read, as opposed to a fault. */
export class AccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AccountError";
  }
}

const BCRYPT_ROUNDS = 10;
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 5;

/** Link tokens carry 256 bits of randomness, so a plain hash is enough. */
function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Six digits are guessable offline from a plain hash, so codes are keyed
 * with the server secret: a copied database row alone cannot be brute-forced.
 * The user id is mixed in so two people's codes never share a hash.
 */
function hashResetCode(userId: string, code: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return createHmac("sha256", secret).update(`reset:${userId}:${code}`).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export type RegisterOutcome =
  | { kind: "created"; userId: string; verifyToken: string; firstName: string }
  | { kind: "resent"; userId: string; verifyToken: string; firstName: string }
  | { kind: "exists"; firstName: string };

export const AccountService = {
  /**
   * Starts a guest sign-up. Never says whether the email was already known:
   * the caller shows the same "check your email" screen in every case, and
   * the email itself tells the real owner what happened.
   */
  async register(input: { firstName: string; lastName: string; email: string; password: string }): Promise<RegisterOutcome> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, emailVerifiedAt: true, employee: { select: { id: true } } },
    });

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    if (existing) {
      // Unconfirmed guest sign-up being tried again (lost the email, typo in
      // the password): take the new password and send a fresh link.
      if (!existing.emailVerifiedAt && !existing.employee) {
        await prisma.user.update({ where: { id: existing.id }, data: { passwordHash } });
        const verifyToken = await this.issueVerifyToken(existing.id, input);
        return { kind: "resent", userId: existing.id, verifyToken, firstName: input.firstName };
      }
      return { kind: "exists", firstName: input.firstName };
    }

    try {
      const user = await prisma.user.create({
        data: { email: input.email, passwordHash, isActive: true, emailVerifiedAt: null },
        select: { id: true },
      });
      const verifyToken = await this.issueVerifyToken(user.id, input);
      return { kind: "created", userId: user.id, verifyToken, firstName: input.firstName };
    } catch (error) {
      // Two sign-ups for one address at the same moment.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return { kind: "exists", firstName: input.firstName };
      }
      throw error;
    }
  },

  async issueVerifyToken(userId: string, names: { firstName: string; lastName: string }) {
    const token = randomBytes(32).toString("base64url");
    await prisma.$transaction([
      prisma.authToken.updateMany({
        where: { userId, purpose: "VERIFY_EMAIL", usedAt: null },
        data: { usedAt: new Date() },
      }),
      prisma.authToken.create({
        data: {
          userId,
          purpose: "VERIFY_EMAIL",
          tokenHash: hashLinkToken(token),
          meta: { firstName: names.firstName, lastName: names.lastName },
          expiresAt: new Date(Date.now() + VERIFY_TTL_MS),
        },
      }),
    ]);
    return token;
  },

  /** For "send me the link again". Null when there is nothing to resend. */
  async resendVerification(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true, isActive: true, guestProfile: { select: { firstName: true, lastName: true } } },
    });
    if (!user || user.emailVerifiedAt || !user.isActive) return null;
    const last = await prisma.authToken.findFirst({
      where: { userId: user.id, purpose: "VERIFY_EMAIL" },
      orderBy: { createdAt: "desc" },
      select: { meta: true },
    });
    const meta = (last?.meta ?? {}) as { firstName?: string; lastName?: string };
    const names = { firstName: meta.firstName ?? "", lastName: meta.lastName ?? "" };
    const token = await this.issueVerifyToken(user.id, names);
    return { token, firstName: names.firstName };
  },

  /**
   * Confirms the address and, only now that ownership is proven, connects
   * the account to the guest profile for that email: an existing one (from
   * earlier bookings) or a new one. Returns the user id to sign in.
   */
  async verifyEmail(token: string): Promise<string> {
    const row = await prisma.authToken.findUnique({
      where: { tokenHash: hashLinkToken(token) },
      select: { id: true, userId: true, purpose: true, usedAt: true, expiresAt: true, meta: true, user: { select: { email: true, isActive: true } } },
    });
    if (!row || row.purpose !== "VERIFY_EMAIL" || row.usedAt || row.expiresAt < new Date() || !row.user.isActive) {
      throw new AccountError("That confirmation link has expired or was already used. Sign in to get a new one.");
    }
    const meta = (row.meta ?? {}) as { firstName?: string; lastName?: string };

    await prisma.$transaction(async (tx) => {
      await tx.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });

      const profile = await tx.guestProfile.findUnique({ where: { email: row.user.email }, select: { id: true, userId: true } });
      if (!profile) {
        await tx.guestProfile.create({
          data: { email: row.user.email, firstName: meta.firstName || "Guest", lastName: meta.lastName || "", userId: row.userId },
        });
      } else if (!profile.userId) {
        await tx.guestProfile.update({ where: { id: profile.id }, data: { userId: row.userId } });
      }
    });
    return row.userId;
  },

  /**
   * Sends a 6-digit code. Returns null (and sends nothing) for unknown or
   * switched-off accounts; the caller shows the same screen either way.
   */
  async requestPasswordReset(email: string): Promise<{ code: string; firstName: string } | null> {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isActive: true, deletedAt: true, guestProfile: { select: { firstName: true } }, employee: { select: { firstName: true } } },
    });
    if (!user || !user.isActive || user.deletedAt) return null;

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    // A per-issue salt keeps every row's hash unique (tokenHash is unique)
    // even when two issues happen to draw the same six digits.
    const salt = randomBytes(8).toString("hex");
    await prisma.$transaction([
      prisma.authToken.updateMany({ where: { userId: user.id, purpose: "RESET_PASSWORD", usedAt: null }, data: { usedAt: new Date() } }),
      prisma.authToken.create({
        data: {
          userId: user.id,
          purpose: "RESET_PASSWORD",
          tokenHash: hashResetCode(user.id, `${code}:${salt}`),
          meta: { salt },
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      }),
    ]);

    return { code, firstName: user.guestProfile?.firstName ?? user.employee?.firstName ?? "" };
  },

  /**
   * Checks the code and sets the new password. Five wrong tries and the code
   * is spent. Entering the right code also proves the inbox, so an account
   * still awaiting confirmation is confirmed here too.
   */
  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    const generic = new AccountError("That code is not right, or it has expired. Ask for a new one.");
    if (!user || !user.isActive) throw generic;

    const row = await prisma.authToken.findFirst({
      where: { userId: user.id, purpose: "RESET_PASSWORD", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, tokenHash: true, attempts: true, meta: true },
    });
    if (!row) throw generic;
    if (row.attempts >= RESET_MAX_ATTEMPTS) {
      await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      throw new AccountError("Too many wrong codes. Ask for a new one.");
    }

    const salt = ((row.meta ?? {}) as { salt?: string }).salt ?? "";
    if (!sameHash(row.tokenHash, hashResetCode(user.id, `${code}:${salt}`))) {
      const attempts = row.attempts + 1;
      await prisma.authToken.update({
        where: { id: row.id },
        data: { attempts, ...(attempts >= RESET_MAX_ATTEMPTS ? { usedAt: new Date() } : {}) },
      });
      const left = RESET_MAX_ATTEMPTS - attempts;
      throw new AccountError(
        left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one.",
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.user.updateMany({ where: { id: user.id, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } }),
    ]);
  },
};
