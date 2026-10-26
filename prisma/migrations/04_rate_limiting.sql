-- ============================================================================
-- MIGRATION: 04_rate_limiting.sql
-- PURPOSE: Back the login and public-booking throttles with a table.
--
--          Before this there was no throttle at all: the admin login accepted
--          unlimited password guesses, and the public booking form could be
--          driven in a loop to hold every room in the property.
--
--          The counter lives in Postgres because the app runs as serverless
--          functions. An in-memory counter is per-instance and is wiped by
--          every cold start, so it limits nothing in production.
--
-- HOW TO APPLY
--   As with 01-03, hand-applied; there is no `_prisma_migrations` history.
--     psql "$DIRECT_URL" -f prisma/migrations/04_rate_limiting.sql
--   then regenerate the client with `npx prisma generate`.
--
--   Re-runnable: every statement is IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "RateLimitHit" (
  "key"         TEXT        NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "count"       INTEGER     NOT NULL DEFAULT 0,

  CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key", "windowStart")
);

-- Sweeping expired windows is a range scan over this column.
CREATE INDEX IF NOT EXISTS "RateLimitHit_windowStart_idx"
  ON "RateLimitHit" ("windowStart");
