import "dotenv/config";
import { PrismaClient, DriverEmploymentStatus } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * SAMPLE DATA — NOT FOR PRODUCTION.
 *
 * Fictional drivers so the public directory and the admin fleet screens can
 * be seen working before real staff are entered. Kept out of prisma/seed.ts
 * deliberately: the main seed creates only what is needed to sign in, and
 * invented records in a live database are worse than empty screens.
 *
 *   npm run seed:sample-drivers          add them
 *   npm run seed:sample-drivers -- --remove   take them away again
 *
 * Everything created here carries the SAMPLE_PREFIX in its employee number
 * and licence, so removal is exact and can never touch a real record.
 *
 * Avatars are generated initials from ui-avatars.com, not photographs.
 * Stock portraits would put a real person's face against a fictional
 * employee of a real business.
 *
 * The rating aggregates below are fabricated. They are written straight onto
 * SafariDriver rather than derived from SafariReview rows, so no fake guest
 * review exists — but the stars they produce are not real feedback. Remove
 * this data before launch.
 */

const SAMPLE_PREFIX = "SAMPLE-";

function avatar(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=400&background=064e3b&color=6ee7b7&bold=true&format=png`;
}

const SAMPLE_DRIVERS = [
  {
    firstName: "Sunil",
    lastName: "Perera",
    experience: 14,
    isAvailable: true,
    notes: "Senior tracker. Knows the Udawalawe herd movements well.",
    ratingCount: 38,
    ratingAvg: 4.8,
    categories: { safety: 4.9, punctuality: 4.8, professionalism: 4.8, communication: 4.6, knowledge: 4.9 },
  },
  {
    firstName: "Nimal",
    lastName: "Bandara",
    experience: 9,
    isAvailable: true,
    notes: "Early-morning drives, good with families.",
    ratingCount: 21,
    ratingAvg: 4.6,
    categories: { safety: 4.8, punctuality: 4.7, professionalism: 4.5, communication: 4.4, knowledge: 4.5 },
  },
  {
    firstName: "Kasun",
    lastName: "Jayawardena",
    experience: 6,
    isAvailable: true,
    notes: "Photography drives; patient at waterholes.",
    ratingCount: 12,
    ratingAvg: 4.7,
    categories: { safety: 4.7, punctuality: 4.5, professionalism: 4.7, communication: 4.8, knowledge: 4.6 },
  },
  {
    firstName: "Ruwan",
    lastName: "Dissanayake",
    experience: 11,
    isAvailable: false,
    notes: "On leave until the end of the month.",
    ratingCount: 27,
    ratingAvg: 4.5,
    categories: { safety: 4.6, punctuality: 4.3, professionalism: 4.5, communication: 4.5, knowledge: 4.7 },
  },
  {
    firstName: "Chaminda",
    lastName: "Fernando",
    experience: 3,
    isAvailable: true,
    notes: "Recently joined. No reviews yet.",
    ratingCount: 0,
    ratingAvg: null,
    categories: null,
  },
];

async function remove() {
  const drivers = await prisma.safariDriver.findMany({
    where: { licenseNumber: { startsWith: SAMPLE_PREFIX } },
    select: { id: true, employeeId: true },
  });
  if (drivers.length === 0) {
    console.log("No sample drivers found.");
    return;
  }
  const employeeIds = drivers.map((d) => d.employeeId);
  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds } },
    select: { userId: true },
  });

  await prisma.safariDriver.deleteMany({ where: { id: { in: drivers.map((d) => d.id) } } });
  await prisma.propertyAssignment.deleteMany({ where: { employeeId: { in: employeeIds } } });
  await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  await prisma.user.deleteMany({ where: { id: { in: employees.map((e) => e.userId) } } });

  console.log(`Removed ${drivers.length} sample drivers and their employee/user rows.`);
}

async function add() {
  const property = await prisma.property.findFirst({ select: { id: true, organizationId: true } });
  if (!property) {
    throw new Error("No property found. Run `npm run seed` first.");
  }

  for (const [i, d] of SAMPLE_DRIVERS.entries()) {
    const seq = String(i + 1).padStart(2, "0");
    const employeeNumber = `${SAMPLE_PREFIX}DRV-${seq}`;
    const email = `sample.driver.${seq}@invalid.local`;

    // passwordHash stays null: these accounts exist to satisfy the
    // Employee -> User relation and must never be able to sign in.
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, isActive: false },
    });

    const employee = await prisma.employee.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        organizationId: property.organizationId,
        employeeId: employeeNumber,
        firstName: d.firstName,
        lastName: d.lastName,
      },
    });

    await prisma.propertyAssignment.upsert({
      where: {
        employeeId_propertyId: { employeeId: employee.id, propertyId: property.id },
      },
      update: {},
      create: { employeeId: employee.id, propertyId: property.id },
    });

    const licenceExpiry = new Date();
    licenceExpiry.setFullYear(licenceExpiry.getFullYear() + 2);

    await prisma.safariDriver.upsert({
      where: { employeeId: employee.id },
      update: {},
      create: {
        employeeId: employee.id,
        licenseNumber: `${SAMPLE_PREFIX}LIC-${seq}`,
        licenseExpiry: licenceExpiry,
        safariExperienceYears: d.experience,
        employmentStatus: DriverEmploymentStatus.ACTIVE,
        isAvailable: d.isAvailable,
        isActive: true,
        imageUrl: avatar(`${d.firstName} ${d.lastName}`),
        notes: d.notes,
        ratingCount: d.ratingCount,
        ratingAvg: d.ratingAvg,
        ratingBayesian: d.ratingAvg,
        ratingSafetyAvg: d.categories?.safety ?? null,
        ratingPunctualityAvg: d.categories?.punctuality ?? null,
        ratingProfessionalismAvg: d.categories?.professionalism ?? null,
        ratingCommunicationAvg: d.categories?.communication ?? null,
        ratingKnowledgeAvg: d.categories?.knowledge ?? null,
        ratingsUpdatedAt: d.ratingCount > 0 ? new Date() : null,
      },
    });

    console.log(`  ${d.firstName} ${d.lastName} — ${d.experience}y, ${d.ratingCount} reviews`);
  }

  console.log(
    `\nAdded ${SAMPLE_DRIVERS.length} SAMPLE drivers. Ratings are fabricated.` +
      `\nRemove before launch:  npm run seed:sample-drivers -- --remove`,
  );
}

const main = process.argv.includes("--remove") ? remove : add;

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
