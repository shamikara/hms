import "dotenv/config";
import {
  PrismaClient,
  RoomStatus,
  ReservationStatus,
  StayStatus,
  InvoiceStatus,
  LineItemCategory,
} from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * SAMPLE DATA — NOT FOR PRODUCTION.
 *
 * Rooms, guests, reservations and invoices so the admin screens show real
 * numbers read from the database instead of hardcoded arrays.
 *
 *   npm run seed:sample-ops            add
 *   npm run seed:sample-ops -- --remove   take away
 *
 * Guests use @invalid.local addresses, which RFC 6761 reserves as
 * permanently unresolvable, so nothing here can email a real person by
 * accident. Removal keys off that suffix and the SAMPLE- room prefix, so it
 * can never touch a real record.
 *
 * The real property's three room types are used, matching the public site.
 */

const SAMPLE_PREFIX = "SAMPLE-";
const SAMPLE_EMAIL_SUFFIX = "@invalid.local";

const ROOM_TYPES = [
  { name: "Deluxe Double Room", capacity: 2, rate: 12500, rooms: ["101", "102"] },
  { name: "Deluxe Quadruple Room", capacity: 4, rate: 19500, rooms: ["103"] },
  { name: "Family Junior Suite", capacity: 6, rate: 24000, rooms: ["201"] },
];

const GUESTS = [
  { firstName: "Dilani", lastName: "Rajapaksa", nights: 3, status: ReservationStatus.CONFIRMED, offset: 0 },
  { firstName: "Tharindu", lastName: "Silva", nights: 2, status: ReservationStatus.CONFIRMED, offset: 0 },
  { firstName: "Hannah", lastName: "Mueller", nights: 4, status: ReservationStatus.CONFIRMED, offset: 3 },
  { firstName: "Arjun", lastName: "Mehta", nights: 2, status: ReservationStatus.DRAFT, offset: 7 },
  { firstName: "Priya", lastName: "Nandasena", nights: 5, status: ReservationStatus.DRAFT, offset: 12 },
  { firstName: "James", lastName: "O'Connor", nights: 3, status: ReservationStatus.CONFIRMED, offset: -6 },
  { firstName: "Yuki", lastName: "Tanaka", nights: 2, status: ReservationStatus.CANCELLED, offset: 5 },
];

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function remove() {
  const guests = await prisma.guestProfile.findMany({
    where: { email: { endsWith: SAMPLE_EMAIL_SUFFIX } },
    select: { id: true },
  });
  const guestIds = guests.map((g) => g.id);

  const reservations = await prisma.reservation.findMany({
    where: { guestId: { in: guestIds } },
    select: { id: true, stays: { select: { id: true } } },
  });
  const reservationIds = reservations.map((r) => r.id);
  const stayIds = reservations.flatMap((r) => r.stays.map((s) => s.id));

  const invoices = await prisma.invoice.findMany({
    where: { OR: [{ reservationId: { in: reservationIds } }, { stayId: { in: stayIds } }] },
    select: { id: true },
  });
  const invoiceIds = invoices.map((i) => i.id);

  await prisma.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await prisma.lineItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
  await prisma.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
  await prisma.roomAssignment.deleteMany({ where: { stayId: { in: stayIds } } });
  await prisma.stay.deleteMany({ where: { id: { in: stayIds } } });
  await prisma.reservation.deleteMany({ where: { id: { in: reservationIds } } });
  await prisma.guestProfile.deleteMany({ where: { id: { in: guestIds } } });

  const rooms = await prisma.room.findMany({
    where: { roomNumber: { startsWith: SAMPLE_PREFIX } },
    select: { id: true },
  });
  await prisma.room.deleteMany({ where: { id: { in: rooms.map((r) => r.id) } } });

  console.log(
    `Removed ${guestIds.length} guests, ${reservationIds.length} reservations, ` +
      `${invoiceIds.length} invoices, ${rooms.length} rooms.`,
  );
}

async function add() {
  const property = await prisma.property.findFirst({
    select: { id: true, baseCurrency: true },
    orderBy: { createdAt: "asc" },
  });
  if (!property) throw new Error("No property found. Run `npm run seed` first.");

  // --- rooms -------------------------------------------------------------
  const building =
    (await prisma.building.findFirst({ where: { propertyId: property.id } })) ??
    (await prisma.building.create({
      data: { propertyId: property.id, name: "Main House" },
    }));

  const floors = new Map<number, string>();
  for (const level of [1, 2]) {
    const existing = await prisma.floor.findFirst({ where: { buildingId: building.id, level } });
    const floor = existing ?? (await prisma.floor.create({ data: { buildingId: building.id, level } }));
    floors.set(level, floor.id);
  }

  const roomIds: string[] = [];
  for (const t of ROOM_TYPES) {
    const existingType = await prisma.roomType.findFirst({
      where: { propertyId: property.id, name: t.name },
    });
    const roomType =
      existingType ??
      (await prisma.roomType.create({
        data: { propertyId: property.id, name: t.name, capacity: t.capacity },
      }));

    for (const number of t.rooms) {
      const roomNumber = `${SAMPLE_PREFIX}${number}`;
      const level = number.startsWith("2") ? 2 : 1;
      const floorId = floors.get(level)!;
      const existingRoom = await prisma.room.findFirst({ where: { floorId, roomNumber } });
      const room =
        existingRoom ??
        (await prisma.room.create({
          data: {
            floorId,
            roomTypeId: roomType.id,
            roomNumber,
            status: number === "103" ? RoomStatus.MAINTENANCE : RoomStatus.AVAILABLE,
          },
        }));
      roomIds.push(room.id);
    }
  }

  // --- guests, reservations, stays, invoices -----------------------------
  const today = new Date();
  let created = 0;

  for (const [i, g] of GUESTS.entries()) {
    const email = `${g.firstName.toLowerCase()}.${g.lastName.toLowerCase().replace(/[^a-z]/g, "")}${SAMPLE_EMAIL_SUFFIX}`;
    const guest = await prisma.guestProfile.upsert({
      where: { email },
      update: {},
      create: {
        firstName: g.firstName,
        lastName: g.lastName,
        email,
        loyaltyPoints: (i + 1) * 120,
      },
    });

    const checkIn = addDays(today, g.offset);
    const checkOut = addDays(today, g.offset + g.nights);

    const existing = await prisma.reservation.findFirst({
      where: { guestId: guest.id, checkInDate: checkIn },
    });
    if (existing) continue;

    const reservation = await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestId: guest.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        status: g.status,
      },
    });

    if (g.status === ReservationStatus.CANCELLED) {
      created++;
      continue;
    }

    const inHouse = g.offset < 0;
    const stay = await prisma.stay.create({
      data: {
        reservationId: reservation.id,
        status: inHouse ? StayStatus.CHECKED_IN : StayStatus.PRE_ARRIVAL,
        actualArrival: inHouse ? checkIn : null,
      },
    });

    await prisma.roomAssignment.create({
      data: {
        stayId: stay.id,
        roomId: roomIds[i % roomIds.length],
        startDate: checkIn,
        endDate: checkOut,
      },
    });

    const type = ROOM_TYPES[i % ROOM_TYPES.length];
    const subtotal = type.rate * g.nights;
    const tax = Math.round(subtotal * 0.15);

    const invoice = await prisma.invoice.create({
      data: {
        reservationId: reservation.id,
        stayId: stay.id,
        status: g.status === ReservationStatus.CONFIRMED && inHouse
          ? InvoiceStatus.CLOSED
          : InvoiceStatus.OPEN,
      },
    });

    await prisma.lineItem.create({
      data: {
        invoiceId: invoice.id,
        category: LineItemCategory.ROOM_RATE,
        description: `${type.name} — ${g.nights} night${g.nights > 1 ? "s" : ""}`,
        subtotal,
        tax,
        discount: 0,
        total: subtotal + tax,
        currencyCode: property.baseCurrency,
      },
    });

    if (i % 2 === 0) {
      const safari = 9000;
      await prisma.lineItem.create({
        data: {
          invoiceId: invoice.id,
          category: LineItemCategory.SAFARI,
          description: "Safari jeep — morning drive",
          subtotal: safari,
          tax: Math.round(safari * 0.15),
          discount: 0,
          total: safari + Math.round(safari * 0.15),
          currencyCode: property.baseCurrency,
        },
      });
    }

    created++;
    console.log(`  ${g.firstName} ${g.lastName} — ${g.nights}n, ${g.status}`);
  }

  console.log(
    `\nAdded ${roomIds.length} rooms and ${created} reservations with guests and invoices.` +
      `\nAll SAMPLE data. Remove with:  npm run seed:sample-ops -- --remove`,
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
