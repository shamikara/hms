import prisma from "@/core/db/prisma";
import { toBookingReference } from "@/features/bookings/lib/reference";

export interface GuestBooking {
  reference: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  rooms: string[];
  status: "Request received" | "Confirmed" | "Staying now" | "Completed" | "Cancelled" | "No-show";
  upcoming: boolean;
}

export interface GuestAccount {
  firstName: string;
  lastName: string;
  email: string;
  isStaff: boolean;
  bookings: GuestBooking[];
  reviewableTrips: number;
  /** False until the email is confirmed with a code; bookings are hidden until then. */
  emailConfirmed: boolean;
}

/** What a signed-in person sees on their account page. Only their own rows. */
export async function getGuestAccount(userId: string): Promise<GuestAccount | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      emailVerifiedAt: true,
      employee: { select: { firstName: true, lastName: true, deletedAt: true } },
      guestProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          reservations: {
            orderBy: { checkInDate: "desc" },
            take: 50,
            select: {
              id: true,
              status: true,
              checkInDate: true,
              checkOutDate: true,
              stays: { select: { status: true, roomAssignments: { select: { room: { select: { roomType: { select: { name: true } } } } } } } },
            },
          },
        },
      },
    },
  });
  if (!user) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Until the address is proven, show nothing tied to it: someone could
  // sign up with another person's email.
  const emailConfirmed = Boolean(user.emailVerifiedAt);
  const visible = emailConfirmed ? (user.guestProfile?.reservations ?? []) : [];

  const bookings: GuestBooking[] = visible.map((r) => {
    const stay = r.stays[0]?.status;
    const status: GuestBooking["status"] =
      r.status === "CANCELLED" ? "Cancelled"
      : r.status === "NO_SHOW" ? "No-show"
      : stay === "CHECKED_OUT" ? "Completed"
      : stay === "CHECKED_IN" ? "Staying now"
      : r.status === "CONFIRMED" ? "Confirmed"
      : "Request received";
    return {
      reference: toBookingReference(r.id),
      checkIn: r.checkInDate.toISOString().slice(0, 10),
      checkOut: r.checkOutDate.toISOString().slice(0, 10),
      nights: Math.round((r.checkOutDate.getTime() - r.checkInDate.getTime()) / 86_400_000),
      rooms: [...new Set(r.stays.flatMap((s) => s.roomAssignments.map((a) => a.room.roomType.name)))],
      status,
      upcoming: r.checkOutDate >= today && status !== "Cancelled" && status !== "No-show",
    };
  });

  let reviewableTrips = 0;
  if (user.guestProfile && emailConfirmed) {
    reviewableTrips = await prisma.safariTrip.count({
      where: { guestId: user.guestProfile.id, status: "COMPLETED", review: null },
    }).catch(() => 0);
  }

  return {
    firstName: user.guestProfile?.firstName ?? user.employee?.firstName ?? "",
    lastName: user.guestProfile?.lastName ?? user.employee?.lastName ?? "",
    email: user.email,
    isStaff: Boolean(user.employee && !user.employee.deletedAt),
    bookings,
    reviewableTrips,
    emailConfirmed,
  };
}
