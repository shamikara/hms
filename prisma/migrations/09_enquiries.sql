-- ============================================================================
-- MIGRATION: 09_enquiries.sql
-- PURPOSE: Store messages from the website's contact form.
--
--          The form used to open the guest's own email app with a mailto link.
--          On a phone or a shared computer with no mail app set up, the button
--          did nothing and the enquiry was lost without anyone knowing. Now the
--          site keeps each message here, emails the reservations inbox, and
--          lists it in Admin > Enquiries.
--
-- HOW TO APPLY
--   As with 01-08, hand-applied; there is no `_prisma_migrations` history.
--     node scripts/db-check.mjs --apply
--   or: psql "$DIRECT_URL" -f prisma/migrations/09_enquiries.sql
--
--   Re-runnable.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnquiryStatus') THEN
    CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'REPLIED', 'CLOSED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Enquiry" (
  "id"          TEXT NOT NULL,
  "propertyId"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "phone"       TEXT,
  "subject"     TEXT NOT NULL,
  "travelDates" TEXT,
  "message"     TEXT NOT NULL,
  "status"      "EnquiryStatus" NOT NULL DEFAULT 'NEW',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Enquiry_propertyId_fkey" FOREIGN KEY ("propertyId")
    REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Enquiry_propertyId_status_createdAt_idx"
  ON "Enquiry" ("propertyId", "status", "createdAt");
