-- ============================================================================
-- MIGRATION: 16_session_version.sql
-- PURPOSE: Sign out every device when a password changes.
--
--          Sessions are signed 24-hour cookies that carry this number. Changing
--          or resetting a password, switching a sign-in off, or removing a
--          staff member adds one to it, and any cookie holding the old number
--          stops working on its next request.
--
-- HOW TO APPLY:  node scripts/db-check.mjs --apply     (re-runnable)
-- ============================================================================

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0;
