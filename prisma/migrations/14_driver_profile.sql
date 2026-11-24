-- ============================================================================
-- MIGRATION: 14_driver_profile.sql
-- PURPOSE: A short public introduction and spoken languages for each safari
--          driver, shown on /safari/drivers so guests can choose who to ride with.
--
-- HOW TO APPLY:  node scripts/db-check.mjs --apply     (re-runnable)
-- ============================================================================

ALTER TABLE "SafariDriver" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "SafariDriver" ADD COLUMN IF NOT EXISTS "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
