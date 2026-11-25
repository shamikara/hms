-- ============================================================================
-- MIGRATION: 17_channel_sync.sql
-- PURPOSE: Keep Booking.com, Agoda (and any site that speaks iCal) in step
--          with this site, so one room is never sold twice.
--
--   CalendarConnection  one per room per outside site. Holds the link we read
--                       from that site (importUrl) and the secret token of the
--                       link that site reads from us (exportToken).
--   ExternalBlock       the nights that site has sold or closed, as last read.
--                       Treated as taken by availability, walk-ins and the
--                       calendar. Replaced wholesale on every successful read.
--
-- HOW TO APPLY:  node scripts/db-check.mjs --apply     (re-runnable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "CalendarConnection" (
  "id"           TEXT NOT NULL,
  "roomId"       TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "importUrl"    TEXT,
  "exportToken"  TEXT NOT NULL,
  "lastSyncedAt" TIMESTAMP(3),
  "lastStatus"   TEXT,
  "lastError"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarConnection_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarConnection_exportToken_key" ON "CalendarConnection"("exportToken");
CREATE INDEX IF NOT EXISTS "CalendarConnection_roomId_idx" ON "CalendarConnection"("roomId");

CREATE TABLE IF NOT EXISTS "ExternalBlock" (
  "id"           TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "roomId"       TEXT NOT NULL,
  "startDate"    TIMESTAMP(3) NOT NULL,
  "endDate"      TIMESTAMP(3) NOT NULL,
  "uid"          TEXT NOT NULL,
  "summary"      TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExternalBlock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ExternalBlock_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CalendarConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ExternalBlock_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ExternalBlock_roomId_startDate_endDate_idx" ON "ExternalBlock"("roomId", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "ExternalBlock_connectionId_idx" ON "ExternalBlock"("connectionId");
