-- ============================================================================
-- MIGRATION: 03_room_rates_and_guest_contact.sql
-- PURPOSE: Give room types a real nightly rate and description, and give guest
--          profiles a phone number.
--
--          Until now the public booking action invented both: every room type
--          was quoted at a hardcoded 850 with the description "Luxury Safari
--          Accommodation", regardless of what the room actually was. A rate
--          shown to a guest has to come from a row someone set.
--
--          All three columns are nullable on purpose. An existing row has no
--          rate, and backfilling one with a guessed number would re-create the
--          problem this migration exists to remove; the booking screen reads
--          NULL as "rate on request" instead.
--
-- HOW TO APPLY
--   As with 01 and 02, this repository tracks migrations as hand-applied
--   numbered SQL files and has no `_prisma_migrations` history. Apply with:
--     psql "$DIRECT_URL" -f prisma/migrations/03_room_rates_and_guest_contact.sql
--   then regenerate the client with `npx prisma generate`.
--
--   Re-runnable: every statement is IF NOT EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Room rates and descriptions.
--    Decimal(19,4) matches LineItem/Payment, so a rate can be copied onto an
--    invoice line without a precision change.
-- ----------------------------------------------------------------------------
ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "basePrice" DECIMAL(19,4);

-- ----------------------------------------------------------------------------
-- 2. Guest contact number.
--    The public booking form collects name and email only, which leaves the
--    front desk no way to reach a guest whose arrival changes.
-- ----------------------------------------------------------------------------
ALTER TABLE "GuestProfile" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- ----------------------------------------------------------------------------
-- 3. Availability lookups filter room types by property and skip soft-deleted
--    rows; the public booking screen runs this on every date change.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "RoomType_active_property_idx"
  ON "RoomType" ("propertyId")
  WHERE "deletedAt" IS NULL;
