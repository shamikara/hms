-- ============================================================================
-- MIGRATION: 10_guest_accounts.sql
-- PURPOSE: Let guests create their own sign-in, and rename the property.
--
--          1. "User"."emailVerifiedAt": a new guest account cannot sign in
--             until the owner clicks the link sent to their address. Only then
--             is it connected to bookings made with that email, so nobody can
--             claim someone else's bookings by typing their address.
--             Every account that exists before this migration (the staff) is
--             marked confirmed, so nobody is locked out.
--
--          2. "AuthToken": one-time email confirmation links and 6-digit
--             password reset codes. Only hashes are stored.
--
--          3. The property and organisation are renamed from "Wildlily Safari
--             Resort" to "Lily Safari Resort", matching the logo. Rows with any
--             other name are left alone.
--
-- HOW TO APPLY
--   As with 01-09, hand-applied; there is no `_prisma_migrations` history.
--     node scripts/db-check.mjs --apply
--
--   Re-runnable.
-- ============================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);
UPDATE "User" SET "emailVerifiedAt" = "createdAt" WHERE "emailVerifiedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthToken_userId_fkey');
-- ^ Backfill only on the first run (before AuthToken exists), so a re-run can
--   never mark a genuinely unconfirmed guest account as confirmed.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthTokenPurpose') THEN
    CREATE TYPE "AuthTokenPurpose" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "AuthToken" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "purpose"   "AuthTokenPurpose" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "attempts"  INTEGER NOT NULL DEFAULT 0,
  "meta"      JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthToken_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AuthToken_tokenHash_key" ON "AuthToken" ("tokenHash");
CREATE INDEX IF NOT EXISTS "AuthToken_userId_purpose_idx" ON "AuthToken" ("userId", "purpose");

UPDATE "Property"     SET "name" = 'Lily Safari Resort' WHERE "name" = 'Wildlily Safari Resort';
UPDATE "Organization" SET "name" = 'Lily Safari Resort' WHERE "name" = 'Wildlily Safari Resort';
