-- ============================================================================
-- MIGRATION: 07_assignment_rate_snapshot.sql
-- PURPOSE: Record the nightly rate at the moment a room is booked.
--
--          Without this the folio reads RoomType.basePrice at check-out, which
--          is today's price, not the one the guest agreed to. Put a rate up in
--          April and every guest already booked for June is silently billed
--          the new figure on departure.
--
--          Nullable because existing assignments were made before any rate was
--          captured. The folio falls back to the room type's current rate for
--          those and has no better option; new bookings all carry their own.
--
-- HOW TO APPLY
--   As with 01-06, hand-applied; there is no `_prisma_migrations` history.
--     psql "$DIRECT_URL" -f prisma/migrations/07_assignment_rate_snapshot.sql
--   then regenerate the client with `npx prisma generate`.
--
--   Re-runnable.
-- ============================================================================

ALTER TABLE "RoomAssignment" ADD COLUMN IF NOT EXISTS "ratePerNight" DECIMAL(19,4);

-- Backfill from the room type's current rate. This is a guess for any booking
-- taken before the column existed -- it is today's price applied backwards --
-- but it is the only rate on record, and leaving it NULL would make those
-- folios refuse to post at all.
UPDATE "RoomAssignment" ra
SET "ratePerNight" = rt."basePrice"
FROM "Room" r, "RoomType" rt
WHERE ra."roomId" = r."id"
  AND r."roomTypeId" = rt."id"
  AND ra."ratePerNight" IS NULL
  AND rt."basePrice" IS NOT NULL;
