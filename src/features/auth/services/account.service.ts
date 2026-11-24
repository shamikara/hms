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
/**
 * The inbox is proven: mark the email confirmed and attach the account to the
 * guest profile for that address (taking it over from an unproven sign-up if
 * one had claimed it), so bookings made with the email appear.
 */
async function markVerifiedAndLink(
  tx: Prisma.TransactionClient,
  userId: string,
  email: string,
  names: { firstName?: string; lastName?: string } = {},
) {
  await tx.user.updateMany({ where: { id: userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  const profile = await tx.guestProfile.findUnique({ where: { email }, select: { id: true, userId: true } });
  if (!profile) {
    await tx.guestProfile.create({ data: { email, firstName: names.firstName || "Guest", lastName: names.lastName || "", userId } });
  } else if (profile.userId !== userId) {
    await tx.guestProfile.update({ where: { id: profile.id }, data: { userId } });
  }
}

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

export type RegisterOutcome = { userId: string };

const CODE_TTL_MS = 15 * 60 * 1000;

/** Keyed hash for 6-digit codes; the purpose is mixed in so codes never cross over. */
function hashCode(purpose: "reset" | "verify", userId: string, code: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return createHmac("sha256", secret).update(`${purpose}:${userId}:${code}`).digest("hex");
}

export const AccountService = {
  /**
   * Guest sign-up: creates the account and the caller signs the person in
   * straight away. No email step.
   *
   * Bookings stay private until the email is proven: a new account is only
   * attached to a guest profile here when no one has booked with that email
   * before, and the account page shows bookings only once the email is
   * confirmed with a 6-digit code. So signing up with someone else's address
   * shows nothing of theirs.
   */
  async register(input: { firstName: string; lastName: string; email: string; password: string }): Promise<RegisterOutcome> {
    const taken = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (taken) {
      throw new AccountError("There is already an account with this email. Sign in instead, or use “Forgot password”.");
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email: input.email, passwordHash, isActive: true, emailVerifiedAt: null },
          select: { id: true },
        });
        const profile = await tx.guestProfile.findUnique({ where: { email: input.email }, select: { id: true } });
        if (!profile) {
          await tx.guestProfile.create({
            data: { email: input.email, firstName: input.firstName, lastName: input.lastName, userId: user.id },
          });
        }
        return { userId: user.id };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AccountError("There is already an account with this email. Sign in instead, or use “Forgot password”.");
      }
      throw error;
    }
  },

  /** Emails a 6-digit code that confirms the address. Null when already confirmed. */
  async requestEmailCode(userId: string): Promise<{ email: string; code: string; firstName: string } | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true, emailVerifiedAt: true, guestProfile: { select: { firstName: true } } },
    });
    if (!user || !user.isActive || user.emailVerifiedAt) return null;
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    const salt = randomBytes(8).toString("hex");
    await prisma.$transaction([
      prisma.authToken.updateMany({ where: { userId, purpose: "VERIFY_EMAIL", usedAt: null }, data: { usedAt: new Date() } }),
      prisma.authToken.create({
        data: {
          userId,
          purpose: "VERIFY_EMAIL",
          tokenHash: hashCode("verify", userId, `${code}:${salt}`),
          meta: { salt, kind: "code" },
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      }),
    ]);
    return { email: user.email, code, firstName: user.guestProfile?.firstName ?? "" };
  },

  /** Checks the code; on success the email is confirmed and earlier bookings appear. */
  async confirmEmailCode(userId: string, code: string): Promise<void> {
    const generic = new AccountError("That code is not right, or it has expired. Ask for a new one.");
    const row = await prisma.authToken.findFirst({
      where: { userId, purpose: "VERIFY_EMAIL", usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      select: { id: true, tokenHash: true, attempts: true, meta: true, user: { select: { email: true, isActive: true } } },
    });
    if (!row || !row.user.isActive) throw generic;
    if (row.attempts >= RESET_MAX_ATTEMPTS) {
      await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      throw new AccountError("Too many wrong codes. Ask for a new one.");
    }
    const salt = ((row.meta ?? {}) as { salt?: string }).salt ?? "";
    if (!sameHash(row.tokenHash, hashCode("verify", userId, `${code}:${salt}`))) {
      const attempts = row.attempts + 1;
      await prisma.authToken.update({
        where: { id: row.id },
        data: { attempts, ...(attempts >= RESET_MAX_ATTEMPTS ? { usedAt: new Date() } : {}) },
      });
      const left = RESET_MAX_ATTEMPTS - attempts;
      throw new AccountError(left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Ask for a new one.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      await markVerifiedAndLink(tx, userId, row.user.email);
    });
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
      await markVerifiedAndLink(tx, row.userId, row.user.email, meta);
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
    await prisma.$transaction(async (tx) => {
      await tx.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
      await markVerifiedAndLink(tx, user.id, email);
    });
  },
};
