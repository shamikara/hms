-- ============================================================================
-- MIGRATION: 13_media_library.sql
-- PURPOSE: Photos uploaded from Admin > Photos. The files live in Supabase
--          Storage (bucket "media"); this table lists them so the site knows
--          their size and description, and can refuse to delete one in use.
--
--          Where photos are used (homepage slideshow, Food page wall) is kept
--          in the Setting table, keys media.heroSlides and media.foodGallery.
--          Until those are saved, the site shows its built-in photos.
--
-- HOW TO APPLY:  node scripts/db-check.mjs --apply     (re-runnable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id"          TEXT NOT NULL,
  "propertyId"  TEXT NOT NULL,
  "path"        TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "width"       INTEGER NOT NULL,
  "height"      INTEGER NOT NULL,
  "bytes"       INTEGER NOT NULL,
  "alt"         TEXT NOT NULL DEFAULT '',
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MediaAsset_path_key" ON "MediaAsset" ("path");
CREATE INDEX IF NOT EXISTS "MediaAsset_propertyId_createdAt_idx" ON "MediaAsset" ("propertyId", "createdAt");
