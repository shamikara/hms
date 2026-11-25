// Checks the database in DATABASE_URL against what the booking code expects,
// and optionally applies the hand-run migrations that are missing.
//
//   node scripts/db-check.mjs            read-only report
//   node scripts/db-check.mjs --apply    also run missing migrations 03-16
//
// Uses the `pg` package and `.env` already in the repo; no psql or Supabase
// dashboard needed. Never prints the password.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(join(root, ".env"));
} catch {
  // No .env, or Node older than 20.12: fall back to the shell's environment.
}

const APPLY = process.argv.includes("--apply");
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

const parsed = new URL(url);
console.log(`Database: ${parsed.username}@${parsed.hostname}:${parsed.port}${parsed.pathname}\n`);

// Each migration and the objects whose presence shows it has been applied.
const MIGRATIONS = [
  { file: "03_room_rates_and_guest_contact.sql", checks: [["column", "RoomType", "description"], ["column", "RoomType", "basePrice"], ["column", "GuestProfile", "phone"]] },
  { file: "04_rate_limiting.sql", checks: [["table", "RateLimitHit"]] },
  { file: "05_room_assignment_overlap.sql", checks: [["column", "RoomAssignment", "releasedAt"], ["constraint", "RoomAssignment_no_overlap"]] },
  { file: "06_housekeeping_and_tax.sql", checks: [["column", "Room", "housekeeping"]] },
  { file: "07_assignment_rate_snapshot.sql", checks: [["column", "RoomAssignment", "ratePerNight"]] },
  { file: "08_room_type_public_content.sql", checks: [["column", "RoomType", "imageUrl"], ["column", "RoomType", "features"]] },
  { file: "09_enquiries.sql", checks: [["table", "Enquiry"]] },
  { file: "10_guest_accounts.sql", checks: [["column", "User", "emailVerifiedAt"], ["table", "AuthToken"]] },
  { file: "11_food_menu.sql", checks: [["table", "Dish"], ["table", "DailyMenuItem"]] },
  { file: "12_online_payments.sql", checks: [["table", "OnlinePayment"], ["table", "OnlineRefund"], ["table", "PaymentWebhookEvent"]] },
  { file: "13_media_library.sql", checks: [["table", "MediaAsset"]] },
  { file: "14_driver_profile.sql", checks: [["column", "SafariDriver", "bio"], ["column", "SafariDriver", "languages"]] },
  { file: "15_photo_fields.sql", checks: [["column", "Dish", "imageUrl"], ["column", "RoomType", "gallery"]] },
  { file: "16_session_version.sql", checks: [["column", "User", "sessionVersion"]] },
];

// Same connection settings as src/core/db/prisma.ts, so if the site connects
// this does too.
const client = new pg.Client({ connectionString: url });

async function has([kind, a, b]) {
  if (kind === "column") {
    const r = await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`, [a, b]);
    return r.rowCount > 0;
  }
  if (kind === "table") {
    const r = await client.query(`SELECT to_regclass($1) AS t`, [`public."${a}"`]);
    return r.rows[0].t !== null;
  }
  const r = await client.query(`SELECT 1 FROM pg_constraint WHERE conname=$1`, [a]);
  return r.rowCount > 0;
}

async function main() {
  await client.connect();

  console.log("Migrations:");
  const missing = [];
  for (const m of MIGRATIONS) {
    // One at a time: a single pg client cannot run queries in parallel.
    let ok = true;
    for (const check of m.checks) ok = (await has(check)) && ok;
    console.log(`  ${ok ? "OK     " : "MISSING"} ${m.file}`);
    if (!ok) missing.push(m.file);
  }

  if (missing.length && APPLY) {
    console.log("\nApplying missing migrations:");
    for (const file of missing) {
      const sql = readFileSync(join(root, "prisma", "migrations", file), "utf8");
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`  applied ${file}`);
      } catch (e) {
        await client.query("ROLLBACK");
        console.error(`  FAILED  ${file}: ${e.message}`);
        console.error("  Stopped; nothing from this file was kept. Later files were not run.");
        process.exitCode = 1;
        break;
      }
    }
  } else if (missing.length) {
    console.log("\nRun again with --apply to apply the missing ones.");
  }

  if (missing.length && !APPLY) return;
  if (process.exitCode) return;

  // What the public booking screen will actually offer. Mirrors
  // BookingRepository.getAvailableRooms: a room counts only if it is
  // AVAILABLE, not deleted, and reachable via floor -> building -> property.
  console.log("\nBookable setup:");
  const props = await client.query(
    `SELECT id, name, "baseCurrency" FROM "Property" WHERE "deletedAt" IS NULL ORDER BY "createdAt" ASC`);
  if (props.rowCount === 0) console.log("  No property found.");
  props.rows.forEach((p, i) =>
    console.log(`  ${i === 0 ? "[used by /book] " : "                "}${p.name} (${p.baseCurrency})`));

  if (props.rowCount > 0) {
    const types = await client.query(
      `SELECT rt.name, rt.capacity, rt."basePrice",
              COUNT(r.id) FILTER (WHERE r.status='AVAILABLE' AND r."deletedAt" IS NULL
                                    AND f."deletedAt" IS NULL AND b."propertyId"=$1) AS bookable,
              COUNT(r.id) AS total
         FROM "RoomType" rt
         LEFT JOIN "Room" r ON r."roomTypeId"=rt.id
         LEFT JOIN "Floor" f ON f.id=r."floorId"
         LEFT JOIN "Building" b ON b.id=f."buildingId"
        WHERE rt."propertyId"=$1 AND rt."deletedAt" IS NULL
        GROUP BY rt.id ORDER BY rt.name`, [props.rows[0].id]);
    if (types.rowCount === 0) console.log("  No room types for this property: the search will show no rooms.");
    for (const t of types.rows) {
      const rate = t.basePrice === null ? "rate on request" : `rate ${t.basePrice}`;
      const warn = Number(t.bookable) === 0 ? "   <-- nothing bookable" : "";
      console.log(`  ${t.name}: sleeps ${t.capacity}, ${rate}, ${t.bookable}/${t.total} rooms bookable${warn}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("\nError:", e.message);
    process.exitCode = 1;
  })
  .finally(() => client.end());
