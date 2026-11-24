import prisma from "@/core/db/prisma";
import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { toBookingReference } from "@/features/bookings/lib/reference";
import { sendEmail } from "./email.service";
import { C, FONT, SERIF, button, detailRows, digits, e, oneLine, shell } from "./email-layout";
import { formatDate, stayTicket } from "./booking-notifications";

interface StatusEmailDetails {
  reference: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomTypeNames: string[];
  guest: { firstName: string; email: string };
}

const nightsBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

function footer(contact: ContactValues) {
  return `
<tr><td style="background:${C.forest};padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:#a8a29e;">
  <strong style="color:#ffffff;">${e(SITE.name)}</strong><br>
  ${e(contact.street)}, ${e(contact.locality)} ${e(contact.postalCode)}, Sri Lanka<br>
  <a href="${SITE_URL}" style="color:#6ee7b7;text-decoration:none;">${e(SITE_URL.replace(/^https?:\/\//, ""))}</a>
</td></tr>`;
}

function card(d: StatusEmailDetails) {
  const n = nightsBetween(d.checkInDate, d.checkOutDate);
  return `
<tr><td style="padding:22px 32px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #d6d3d1;border-radius:18px;">
    <tr><td style="padding:20px 20px 6px;font-family:${FONT};">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">Your reference</div>
      <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:3px;color:${C.forest};margin-top:2px;">${e(d.reference)}</div>
    </td></tr>
    <tr><td style="padding:12px 20px;">${stayTicket(d)}</td></tr>
    <tr><td style="padding:4px 20px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailRows([
          ["Room" + (d.roomTypeNames.length > 1 ? "s" : ""), d.roomTypeNames.join(", ") || "To be assigned"],
          ["Stay", `${n} night${n === 1 ? "" : "s"}`],
        ])}
      </table>
    </td></tr>
  </table>
</td></tr>`;
}

export function confirmedEmail(d: StatusEmailDetails, contact: ContactValues) {
  const first = oneLine(d.guest.firstName) || "there";
  const wa = `https://wa.me/${digits(contact.phone)}?text=${encodeURIComponent(`Hello! About my booking ${d.reference}`)}`;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name}, ${contact.street}, ${contact.locality}`)}`;
  const n = nightsBetween(d.checkInDate, d.checkOutDate);
  const html = shell(
    `Your stay on ${formatDate(d.checkInDate, "short")} is confirmed. See you soon!`,
    `
<tr><td style="padding:0;">
  <img src="${SITE_URL}/email/banner.jpg" width="600" alt="${e(SITE.name)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:22px 32px 8px;font-family:${FONT};">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.emerald};font-weight:700;">${e(SITE.name)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.2;color:${C.ink};">You're confirmed, ${e(first)}! &#x1F389;</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    Your room is booked and waiting for you. We're looking forward to welcoming you to Udawalawe.
  </p>
  <div style="margin-top:16px;display:inline-block;background:${C.emeraldLight};color:${C.emerald};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;">
    &#x2705; Booking confirmed
  </div>
</td></tr>
${card(d)}
<tr><td style="padding:22px 32px 4px;font-family:${FONT};font-size:14px;line-height:1.6;color:#44403c;">
  <div style="font-family:${SERIF};font-size:20px;color:${C.ink};margin-bottom:8px;">Good to know</div>
  &bull; Let us know roughly when you'll arrive, so someone is there to greet you.<br>
  &bull; Want a safari drive into Udawalawe National Park? Ask us and we'll arrange the jeep.<br>
  &bull; Plans changed? Message us as early as you can.
</td></tr>
<tr><td style="padding:18px 32px 30px;font-family:${FONT};">
  ${button(wa, "&#x1F4AC; WhatsApp us")}
  ${button(maps, "&#x1F4CD; Directions", "ghost")}
</td></tr>
${footer(contact)}`,
  );
  const text = [
    `You're confirmed, ${first}!`,
    "",
    "Your room is booked and waiting for you.",
    "",
    `Reference: ${d.reference}`,
    `Check in:  ${formatDate(d.checkInDate)}`,
    `Check out: ${formatDate(d.checkOutDate)} (${n} night${n === 1 ? "" : "s"})`,
    `Rooms:     ${d.roomTypeNames.join(", ") || "To be assigned"}`,
    "",
    `Let us know roughly when you'll arrive. Questions? Reply, call ${contact.phoneDisplay}, or WhatsApp ${wa}`,
    "",
    `${SITE.name}, ${contact.street}, ${contact.locality}`,
  ].join("\n");
  return { to: d.guest.email, replyTo: contact.email, subject: `Booking confirmed: see you on ${formatDate(d.checkInDate, "short")}! (${d.reference})`, html, text };
}

export function cancelledEmail(d: StatusEmailDetails, contact: ContactValues) {
  const first = oneLine(d.guest.firstName) || "there";
  const wa = `https://wa.me/${digits(contact.phone)}?text=${encodeURIComponent(`Hello! About my cancelled booking ${d.reference}`)}`;
  const html = shell(
    `Your booking ${d.reference} has been cancelled.`,
    `
<tr><td style="padding:26px 32px 8px;font-family:${FONT};">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.emerald};font-weight:700;">${e(SITE.name)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-weight:normal;font-size:28px;line-height:1.2;color:${C.ink};">Your booking has been cancelled</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    Hello ${e(first)}, this booking is now cancelled. If you didn't expect this, or would like other dates, just message us
    and we'll do our best to help.
  </p>
</td></tr>
${card(d)}
<tr><td style="padding:18px 32px 30px;font-family:${FONT};">
  ${button(wa, "&#x1F4AC; WhatsApp us")}
  ${button(`${SITE_URL}/book`, "Choose new dates", "ghost")}
</td></tr>
${footer(contact)}`,
  );
  const text = [
    `Hello ${first},`,
    "",
    `Your booking ${d.reference} (${formatDate(d.checkInDate)} to ${formatDate(d.checkOutDate)}) has been cancelled.`,
    "If you didn't expect this, or would like other dates, message us and we'll help.",
    "",
    `Call ${contact.phoneDisplay} or WhatsApp ${wa}`,
    `New dates: ${SITE_URL}/book`,
  ].join("\n");
  return { to: d.guest.email, replyTo: contact.email, subject: `Your booking ${d.reference} has been cancelled`, html, text };
}

async function loadDetails(reservationId: string): Promise<StatusEmailDetails | null> {
  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      checkInDate: true,
      checkOutDate: true,
      guest: { select: { firstName: true, email: true } },
      stays: { select: { roomAssignments: { select: { room: { select: { roomType: { select: { name: true } } } } } } } },
    },
  });
  if (!r || !r.guest.email || r.guest.email.endsWith("@invalid.local")) return null;
  return {
    reference: toBookingReference(r.id),
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    roomTypeNames: [...new Set(r.stays.flatMap((s) => s.roomAssignments.map((a) => a.room.roomType.name)))],
    guest: { firstName: r.guest.firstName, email: r.guest.email },
  };
}

/** Tells the guest their booking was confirmed or cancelled. Never throws. */
export async function notifyBookingStatus(reservationId: string, status: "CONFIRMED" | "CANCELLED"): Promise<void> {
  try {
    const [details, { contact }] = await Promise.all([loadDetails(reservationId), getSiteContent()]);
    if (!details) return;
    await sendEmail(status === "CONFIRMED" ? confirmedEmail(details, contact) : cancelledEmail(details, contact));
  } catch (error) {
    console.error("notifyBookingStatus failed:", error instanceof Error ? error.message : error);
  }
}
