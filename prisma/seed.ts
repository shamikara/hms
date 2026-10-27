import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Minimal seed: everything needed to sign in and have the admin pages
 * resolve a role, and nothing more. No sample guests, bookings or invoices —
 * invented records in a live database are worse than empty screens.
 *
 * Credentials come from the environment so none are committed:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' npm run seed
 *
 * Re-running is safe; every step upserts.
 */

const ROLE_NAMES = [
  "SUPER_ADMIN",
  "GENERAL_MANAGER",
  "RESORT_MANAGER",
  "FLEET_MANAGER",
  "SAFARI_COORDINATOR",
  "FINANCE_OFFICER",
  "RECEPTIONIST",
  "HOUSEKEEPER",
  "RANGER",
  "GUIDE",
  "DRIVER",
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD before seeding, e.g.\n" +
        "  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run seed",
    );
  }
  // The minimum is a guard, not a policy engine. It can be waived
  // deliberately, which is louder than quietly lowering the threshold.
  const allowWeak = process.argv.includes("--allow-weak-password");
  if (password.length < 12 && !allowWeak) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 12 characters.\n" +
        "Pass --allow-weak-password to override (not advisable for an admin " +
        "account reachable from the public internet).",
    );
  }
  if (allowWeak) {
    console.warn(
      "WARNING: weak admin password accepted via --allow-weak-password.\n" +
        "         This account can read every guest record. Change it before " +
        "real bookings arrive.\n",
    );
  }

  console.log("Seeding…");

  const organization = await prisma.organization.upsert({
    where: { taxId: "WLSR-001" },
    update: {},
    create: { name: "Wildlily Safari Resort", taxId: "WLSR-001" },
  });

  // Property has no natural unique key, so look it up by name within the org.
  const existingProperty = await prisma.property.findFirst({
    where: { organizationId: organization.id, name: "Wildlily Safari Resort" },
  });
  const property =
    existingProperty ??
    (await prisma.property.create({
      data: {
        organizationId: organization.id,
        name: "Wildlily Safari Resort",
        timezone: "Asia/Colombo",
        baseCurrency: "LKR",
      },
    }));

  for (const name of ROLE_NAMES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  const superAdmin = await prisma.role.findUniqueOrThrow({
    where: { name: "SUPER_ADMIN" },
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true },
    create: { email, passwordHash, isActive: true },
  });

  // Derived from the email so re-running is idempotent and a second admin
  // does not collide with the first on (organizationId, employeeId).
  const employeeNumber =
    "ADM-" +
    Buffer.from(email.toLowerCase())
      .toString("base64url")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 12)
      .toUpperCase();

  const employee = await prisma.employee.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      employeeId: employeeNumber,
      firstName: "Site",
      lastName: "Administrator",
    },
  });

  const assignment = await prisma.propertyAssignment.upsert({
    where: {
      employeeId_propertyId: { employeeId: employee.id, propertyId: property.id },
    },
    update: {},
    create: { employeeId: employee.id, propertyId: property.id },
  });

  await prisma.roleAssignment.upsert({
    where: {
      assignmentId_roleId: { assignmentId: assignment.id, roleId: superAdmin.id },
    },
    update: {},
    create: { assignmentId: assignment.id, roleId: superAdmin.id },
  });

  console.log(`Done. Sign in at /login as ${email} with the password you supplied.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
