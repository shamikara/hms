-- ============================================================================
-- MIGRATION: 05_room_assignment_overlap.sql
-- PURPOSE: Stop the database from ever holding two live bookings in the same
--          room at the same time.
--
--          Until now the only thing preventing a double booking was the
--          SERIALIZABLE transaction in BookingService.createReservation. That
--          works, but it is the whole defence: any future code path that
--          writes a RoomAssignment outside that transaction, or at a weaker
--          isolation level, double-books silently and no test fails.
--
--          SafariTrip has had exactly this protection since migration 02
--          ("OVERLAP PREVENTION (the important one)"). Rooms did not. This
--          brings them level.
--
-- WHY `releasedAt` RATHER THAN READING THE RESERVATION
--   An EXCLUDE constraint can only reference columns on its own row, and
--   whether a booking still holds its room depends on Reservation.status, two
--   tables away (RoomAssignment -> Stay -> Reservation). So the fact is
--   mirrored onto the assignment: NULL means the room is held, a timestamp
--   means it was given back. Cancelling must set it, in the same transaction
--   as the status change.
--
--   The alternative -- deleting assignments on cancellation -- would make the
--   constraint trivial but would throw away the record of which room a
--   cancelled guest had been given, which a hotel needs when a guest disputes
--   a charge or turns up anyway.
--
-- HOW TO APPLY
--   As with 01-04, hand-applied; there is no `_prisma_migrations` history.
--     psql "$DIRECT_URL" -f prisma/migrations/05_room_assignment_overlap.sql
--   then regenerate the client with `npx prisma generate`.
--
--   Re-runnable. Step 3 is guarded by a pg_constraint check because Postgres
--   has no ADD CONSTRAINT IF NOT EXISTS. It will still fail the first time if
--   the existing data already contains a double booking -- which is the point.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. The mirrored flag.
-- ----------------------------------------------------------------------------
ALTER TABLE "RoomAssignment" ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3);

-- ----------------------------------------------------------------------------
-- 2. Backfill: assignments belonging to a cancelled or no-show reservation are
--    not holding anything, so mark them released before the constraint is
--    added. Without this, a cancelled booking would block its own room from
--    being rebooked.
--
--    updatedAt is used as the release time because it is the best record we
--    have of when the cancellation happened; now() would claim every historic
--    cancellation happened at migration time.
-- ----------------------------------------------------------------------------
UPDATE "RoomAssignment" ra
SET "releasedAt" = r."updatedAt"
FROM "Stay" s, "Reservation" r
WHERE ra."stayId" = s."id"
  AND s."reservationId" = r."id"
  AND r."status" IN ('CANCELLED', 'NO_SHOW')
  AND ra."releasedAt" IS NULL;

-- ----------------------------------------------------------------------------
-- 3. OVERLAP PREVENTION.
--    Half-open range: a stay ending on the 5th and one starting on the 5th do
--    not overlap, which is how checkout and checkin actually work. Matches the
--    '[)' bound used by the SafariTrip constraints.
--
--    If this fails with "could not create exclusion constraint", the existing
--    data already contains a double booking. Find them with the query in the
--    comment block at the foot of this file before retrying.
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so the existence check is
-- explicit rather than leaving the migration single-use.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RoomAssignment_no_overlap'
  ) THEN
    ALTER TABLE "RoomAssignment"
      ADD CONSTRAINT "RoomAssignment_no_overlap" EXCLUDE USING gist (
        "roomId" WITH =,
        tsrange("startDate", "endDate", '[)') WITH &&
      ) WHERE ("releasedAt" IS NULL);
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- 4. The availability query filters on exactly this, every time the booking
--    screen is opened.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "RoomAssignment_held_idx"
  ON "RoomAssignment" ("roomId", "startDate", "endDate")
  WHERE "releasedAt" IS NULL;

-- ----------------------------------------------------------------------------
-- Finding pre-existing double bookings, if step 3 is rejected:
--
--   SELECT a."roomId", a."id", b."id", a."startDate", b."startDate"
--   FROM "RoomAssignment" a
--   JOIN "RoomAssignment" b
--     ON a."roomId" = b."roomId"
--    AND a."id" < b."id"
--    AND a."releasedAt" IS NULL
--    AND b."releasedAt" IS NULL
--    AND tsrange(a."startDate", a."endDate", '[)')
--     && tsrange(b."startDate", b."endDate", '[)');
--
-- Each row is two bookings sharing a room. Resolve them by hand -- moving a
-- guest is a decision for the front desk, not for a migration.
-- ----------------------------------------------------------------------------
