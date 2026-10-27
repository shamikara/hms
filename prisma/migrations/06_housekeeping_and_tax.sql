-- ============================================================================
-- MIGRATION: 06_housekeeping_and_tax.sql
-- PURPOSE: Give rooms a housekeeping state, and give invoices somewhere to
--          read a tax rate from.
--
--          Check-out previously ended a stay and left the room looking, to
--          every other part of the system, exactly as it did while the guest
--          was still asleep in it. There was no way for the desk to know a
--          room needed making up, and no way for housekeeping to say it was
--          done.
--
--          `housekeeping` is separate from `status` on purpose. RoomStatus
--          answers "can this be sold at all" (maintenance, out of order);
--          housekeeping answers "can someone walk into it this afternoon". A
--          room is routinely sellable and dirty at once -- that is most of
--          every morning -- and folding them together would force check-out
--          to either take the room off sale or hand the next guest an unmade
--          bed.
--
--          The tax setting is a Setting row rather than a column because tax
--          is a property-level policy that changes by legislation, not a
--          property of any one invoice. No default is inserted: an invented
--          rate on a real bill is worse than a visible zero, so the folio
--          shows "tax not configured" until somebody sets it.
--
-- HOW TO APPLY
--   As with 01-05, hand-applied; there is no `_prisma_migrations` history.
--     psql "$DIRECT_URL" -f prisma/migrations/06_housekeeping_and_tax.sql
--   then regenerate the client with `npx prisma generate`.
--
--   Re-runnable.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Housekeeping state.
--    Existing rooms default to CLEAN. That is the optimistic reading, but the
--    alternative -- marking every room in the property dirty on deploy --
--    would bury the real ones in noise on the first morning.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HousekeepingStatus') THEN
    CREATE TYPE "HousekeepingStatus" AS ENUM ('CLEAN', 'DIRTY', 'INSPECTED');
  END IF;
END
$$;

ALTER TABLE "Room"
  ADD COLUMN IF NOT EXISTS "housekeeping" "HousekeepingStatus" NOT NULL DEFAULT 'CLEAN';

-- The housekeeping list filters on this and nothing else.
CREATE INDEX IF NOT EXISTS "Room_housekeeping_idx"
  ON "Room" ("housekeeping")
  WHERE "deletedAt" IS NULL;

-- ----------------------------------------------------------------------------
-- 2. Nothing to create for tax: the Setting table already exists and is keyed
--    (propertyId, key). The folio reads key 'billing.taxPercent' and treats a
--    missing row as "not configured" rather than as zero tax, so that the bill
--    can say which it is.
--
--    To set it for a property:
--      INSERT INTO "Setting" ("id", "level", "propertyId", "key", "value",
--                             "createdAt", "updatedAt")
--      VALUES (gen_random_uuid()::text, 'PROPERTY', '<propertyId>',
--              'billing.taxPercent', '8'::jsonb, now(), now())
--      ON CONFLICT ("propertyId", "key") DO UPDATE SET "value" = EXCLUDED."value";
-- ----------------------------------------------------------------------------
