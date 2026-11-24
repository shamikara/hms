-- ============================================================================
-- MIGRATION: 11_food_menu.sql
-- PURPOSE: Let staff post "today's menu" from the admin panel.
--
--          "Dish" is the kitchen's repertoire, set up once. "DailyMenuItem"
--          ticks a dish onto a given day, and can mark it sold out. The Food
--          page shows today's ticked dishes.
--
--          A starter list of common dishes is added so staff mostly tick boxes
--          rather than type. None is put on any day's menu, and none has a
--          price. Staff edit, archive or add to them freely. The starter list
--          is only inserted when the property has no dishes yet.
--
-- HOW TO APPLY
--   As with 01-10, hand-applied:  node scripts/db-check.mjs --apply
--   Re-runnable.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MealPeriod') THEN
    CREATE TYPE "MealPeriod" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'ALL_DAY');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Dish" (
  "id"          TEXT NOT NULL,
  "propertyId"  TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "meal"        "MealPeriod" NOT NULL,
  "price"       DECIMAL(19,4),
  "vegetarian"  BOOLEAN NOT NULL DEFAULT false,
  "spicy"       BOOLEAN NOT NULL DEFAULT false,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt"  TIMESTAMP(3),
  CONSTRAINT "Dish_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Dish_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Dish_propertyId_meal_idx" ON "Dish" ("propertyId", "meal");

CREATE TABLE IF NOT EXISTS "DailyMenuItem" (
  "id"         TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "date"       DATE NOT NULL,
  "dishId"     TEXT NOT NULL,
  "soldOut"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyMenuItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DailyMenuItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "DailyMenuItem_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyMenuItem_propertyId_date_dishId_key" ON "DailyMenuItem" ("propertyId", "date", "dishId");
CREATE INDEX IF NOT EXISTS "DailyMenuItem_propertyId_date_idx" ON "DailyMenuItem" ("propertyId", "date");

-- Starter dishes for the oldest property, only if it has none yet.
INSERT INTO "Dish" ("id", "propertyId", "name", "description", "meal", "vegetarian", "spicy", "sortOrder")
SELECT 'dish_' || md5(p."id" || d.name), p."id", d.name, d.description, d.meal::"MealPeriod", d.veg, d.spicy, d.ord
FROM (SELECT "id" FROM "Property" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC LIMIT 1) p
CROSS JOIN (VALUES
  ('String hoppers (idiyappam)', 'Steamed rice-flour nests with dhal curry, pol sambol and kiri hodi', 'BREAKFAST', true,  false, 10),
  ('Kiribath',                   'Coconut milk rice with lunu miris and seeni sambol',                 'BREAKFAST', true,  true,  20),
  ('Egg hoppers',                'Crisp bowl-shaped hoppers with a soft egg, with lunu miris',         'BREAKFAST', false, true,  30),
  ('Pol roti',                   'Coconut flatbread with katta sambol and dhal',                       'BREAKFAST', true,  true,  40),
  ('Western breakfast',          'Eggs your way, toast, butter and jam',                               'BREAKFAST', false, false, 50),
  ('Fresh fruit plate',          'Papaya, pineapple, banana and whatever is in season',                'BREAKFAST', true,  false, 60),
  ('Rice and curry',             'Red rice with five or six vegetable curries, papadam and sambol',    'LUNCH',     true,  true,  10),
  ('Chicken kottu',              'Chopped roti stir-fried with chicken, egg and vegetables',            'LUNCH',     false, true,  20),
  ('Fried rice',                 'With vegetables and egg; chicken on request',                        'LUNCH',     false, false, 30),
  ('Rice and curry with chicken','Red rice, chicken curry and vegetable curries',                       'DINNER',    false, true,  10),
  ('Devilled chicken',           'Wok-fried with onion, capsicum and chilli',                          'DINNER',    false, true,  20),
  ('Grilled fish',               'Catch of the day with salad and potatoes',                           'DINNER',    false, false, 30),
  ('Vegetable curry plate',      'Dhal, beetroot, jackfruit or other curries of the day with rice',    'DINNER',    true,  true,  40),
  ('King coconut',               'Fresh thambili, straight from the tree',                             'ALL_DAY',   true,  false, 10),
  ('Fresh lime juice',           'Made to order',                                                      'ALL_DAY',   true,  false, 20),
  ('Ceylon tea or coffee',       NULL,                                                                  'ALL_DAY',   true,  false, 30)
) AS d(name, description, meal, veg, spicy, ord)
WHERE NOT EXISTS (SELECT 1 FROM "Dish" x WHERE x."propertyId" = p."id");
