-- ============================================================================
-- MIGRATION: 15_photo_fields.sql
-- PURPOSE: More places for photos, all chosen or uploaded with the same
--          picker as Admin > Photos:
--            * Dish.imageUrl      a photo beside the dish in "Today's menu"
--            * RoomType.gallery   extra photos for each room type, shown as a
--                                 swipeable gallery on the Rooms page
--
-- HOW TO APPLY:  node scripts/db-check.mjs --apply     (re-runnable)
-- ============================================================================

ALTER TABLE "Dish" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "gallery" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
