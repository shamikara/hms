-- ============================================================================
-- MIGRATION: 18_safari_request_and_reviews.sql
-- PURPOSE:
--   * A guest can add a safari drive when booking, and ask for a driver
--     (from the "Request this driver" button on /safari/drivers).
--   * After check-out the guest is emailed once, asking for a review on
--     Google / Booking.com / TripAdvisor; reviewRequestSentAt stops repeats.
--
-- HOW TO APPLY:  node scripts/db-check.mjs --apply     (re-runnable)
-- ============================================================================

ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "safariRequest" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "requestedDriverId" TEXT;
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "reviewRequestSentAt" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Reservation_requestedDriverId_fkey') THEN
    ALTER TABLE "Reservation"
      ADD CONSTRAINT "Reservation_requestedDriverId_fkey"
      FOREIGN KEY ("requestedDriverId") REFERENCES "SafariDriver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
