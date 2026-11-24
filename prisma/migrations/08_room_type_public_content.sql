-- ============================================================================
-- MIGRATION: 08_room_type_public_content.sql
-- PURPOSE: Let the public rooms pages be driven from the admin panel.
--
--          The /rooms page and the home-page room carousel were written into
--          the code: a room type renamed, repriced or taken off sale in the
--          admin panel still showed on the website exactly as before. These
--          two columns hold the last pieces of that copy -- the photo and the
--          short highlights list -- so the pages can read everything from
--          RoomType instead.
--
--          The backfill copies what the website showed for the three existing
--          types, matched by name, and only where nothing has been set, so the
--          site looks the same the moment this is applied.
--
-- HOW TO APPLY
--   As with 01-07, hand-applied; there is no `_prisma_migrations` history.
--     node scripts/db-check.mjs --apply
--   or: psql "$DIRECT_URL" -f prisma/migrations/08_room_type_public_content.sql
--
--   Re-runnable.
-- ============================================================================

ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "RoomType" ADD COLUMN IF NOT EXISTS "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "RoomType"
SET "imageUrl" = COALESCE("imageUrl", '/room-deluxe-double.webp'),
    "description" = COALESCE("description",
      'A comfortable air-conditioned double with one queen bed, a private bathroom and a desk. Quiet, spotless and a short drive from the Udawalawe National Park entrance.'),
    "features" = CASE WHEN cardinality("features") = 0
      THEN ARRAY['One Queen Bed','Air Conditioning','Private Bathroom','Desk & Seating Area','Electric Kettle','Free Wi-Fi']
      ELSE "features" END
WHERE "name" = 'Deluxe Double Room' AND "deletedAt" IS NULL;

UPDATE "RoomType"
SET "imageUrl" = COALESCE("imageUrl", '/room-quadruple.webp'),
    "description" = COALESCE("description",
      'Our largest double-bed room, with two queen beds and a view over the pool. Well suited to friends travelling together or a family of four.'),
    "features" = CASE WHEN cardinality("features") = 0
      THEN ARRAY['Two Queen Beds','Pool View','Air Conditioning','Private Bathroom','Electric Kettle','Free Wi-Fi']
      ELSE "features" END
WHERE "name" = 'Deluxe Quadruple Room' AND "deletedAt" IS NULL;

UPDATE "RoomType"
SET "imageUrl" = COALESCE("imageUrl", '/room-twin-yellow.webp'),
    "description" = COALESCE("description",
      'Our most spacious option, with two queen beds and room for up to six. Opens onto the garden and the verandah where breakfast is served.'),
    "features" = CASE WHEN cardinality("features") = 0
      THEN ARRAY['Two Queen Beds','Sleeps Up To Six','Garden View','Air Conditioning','Private Bathroom','Free Wi-Fi']
      ELSE "features" END
WHERE "name" = 'Family Junior Suite' AND "deletedAt" IS NULL;
