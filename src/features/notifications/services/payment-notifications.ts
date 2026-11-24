import prisma from "@/core/db/prisma";
import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { toBookingReference } from "@/features/bookings/lib/reference";
import { quoteReservationCents } from "@/features/payments/services/online-payment.service";
import { sendEmail } from "./email.service";
import { C, FONT, SERIF, button, detailRows, digits, e, oneLine, shell } from "./email-layout";
import { formatDate, stayTicket } from "./booking-notifications";

export interface PaidBookingDetails {
  reservationId: string;
  reference: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomTypeNames: string[];
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
  paidCents: number;
  totalCents: number | null;
  currency: string;
  kind: string;
  card: string | null;
  freeCancelUntil: Date | null;
  attentionNote: string | null;
}

function money(cents: number, currency: string) {
  return `${currency} ${(cents / 100).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function nights(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function policyLine(d: PaidBookingDetails) {
  if (!d.freeCancelUntil) return "This payment is non-refundable if the booking is cancelled.";
  const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Colombo" }).format(d.freeCancelUntil);
  return `Free cancellation until ${when}: cancel by then and we refund what you paid in full. After that, the payment is non-refundable.`;
}

function guestEmail(d: PaidBookingDetails, contact: ContactValues) {
  const first = oneLine(d.guest.firstName);
  const n = nights(d.checkInDate, d.checkOutDate);
  const balance = d.totalCents !== null ? Math.max(0, d.totalCents - d.paidCents) : null;
  const wa = `https://wa.me/${digits(contact.phone)}?text=${encodeURIComponent(`Hello! About my booking ${d.reference}`)}`;
  const rows: [string, string][] = [
    ["Rooms", d.roomTypeNames.join(", ")],
    ["Stay", `${n} night${n === 1 ? "" : "s"}`],
    ["Paid now", `${money(d.paidCents, d.currency)}${d.card ? ` (${d.card})` : ""}`],
    ...(balance !== null ? ([["To pay at the resort", balance === 0 ? "Nothing, you're all paid up" : money(balance, d.currency)]] as [string, string][]) : []),
  ];

  const html = shell(
    `Booking ${d.reference} is confirmed. We received ${money(d.paidCents, d.currency)}.`,
    `
<tr><td style="padding:0;">
  <img src="${SITE_URL}/email/banner.jpg" width="600" alt="${e(SITE.name)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:0 32px;">
  <img src="${SITE_URL}/email/logo.png" width="72" height="72" alt="${e(SITE.name)}" style="display:block;width:72px;height:72px;margin-top:-36px;border-radius:999px;border:4px solid #ffffff;background:#ffffff;">
</td></tr>
<tr><td style="padding:14px 32px 8px;font-family:${FONT};">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.emerald};font-weight:700;">${e(SITE.name)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.2;color:${C.ink};">You're booked, ${e(first)}! &#x1F418;</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    Your payment went through and your room is confirmed. We can't wait to have you in Udawalawe.
  </p>
  <div style="margin-top:16px;display:inline-block;background:${C.emeraldLight};color:${C.emerald};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;">
    &#x2705; Confirmed &middot; payment received
  </div>
</td></tr>
<tr><td style="padding:22px 32px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px dashed #d6d3d1;border-radius:18px;">
    <tr><td style="padding:20px 20px 6px;font-family:${FONT};">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">Your reference</div>
      <div style="font-family:'Courier New',monospace;font-size:26px;font-weight:700;letter-spacing:3px;color:${C.forest};margin-top:2px;">${e(d.reference)}</div>
    </td></tr>
    <tr><td style="padding:12px 20px;">${stayTicket(d)}</td></tr>
    <tr><td style="padding:4px 20px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows(rows)}</table>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:18px 32px 0;font-family:${FONT};">
  <div style="background:${C.sand};border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;color:#44403c;">
    <strong>Cancellation:</strong> ${e(policyLine(d))}
  </div>
</td></tr>
<tr><td style="padding:22px 32px 30px;font-family:${FONT};">
  <p style="margin:0 0 14px;font-size:14px;color:#44403c;">Need to change something, or want to add a safari drive? Just ask.</p>
  ${button(wa, "&#x1F4AC; WhatsApp us")}
  ${button(`tel:${contact.phone}`, `&#x1F4DE; ${e(contact.phoneDisplay)}`, "ghost")}
</td></tr>
<tr><td style="background:${C.forest};padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:#a8a29e;">
  <strong style="color:#ffffff;">${e(SITE.name)}</strong><br>
  ${e(contact.street)}, ${e(contact.locality)} ${e(contact.postalCode)}, Sri Lanka
</td></tr>`,
  );

  const text = [
    `You're booked, ${first}!`,
    "",
    "Your payment went through and your room is confirmed.",
    "",
    `Reference: ${d.reference}`,
    `Check in:  ${formatDate(d.checkInDate)}`,
    `Check out: ${formatDate(d.checkOutDate)} (${n} night${n === 1 ? "" : "s"})`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Cancellation: ${policyLine(d)}`,
    "",
    `Questions? Reply, call ${contact.phoneDisplay}, or WhatsApp ${wa}`,
  ].join("\n");

  return {
    to: d.guest.email,
    replyTo: contact.email,
    subject: `Confirmed! Your stay at ${SITE.name} (${d.reference}) 🐘`,
    html,
    text,
  };
}

function staffEmail(d: PaidBookingDetails, contact: ContactValues) {
  const guestName = oneLine(`${d.guest.firstName} ${d.guest.lastName}`);
  const n = nights(d.checkInDate, d.checkOutDate);
  const adminUrl = `${SITE_URL}/admin/bookings/${encodeURIComponent(d.reservationId)}`;
  const balance = d.totalCents !== null ? Math.max(0, d.totalCents - d.paidCents) : null;
  const rows: [string, string][] = [
    ["Reference", d.reference],
    ["Rooms", d.roomTypeNames.join(", ")],
    ["Paid online", `${money(d.paidCents, d.currency)} · ${d.kind === "FULL" ? "full payment" : "advance"}${d.card ? ` · ${d.card}` : ""}`],
    ...(balance !== null ? ([["Balance at check-in", money(balance, d.currency)]] as [string, string][]) : []),
    ["Email", d.guest.email],
    ["Phone", d.guest.phone ?? "Not given"],
  ];

  const html = shell(
    `${guestName} paid ${money(d.paidCents, d.currency)} · ${formatDate(d.checkInDate, "short")}`,
    `
<tr><td style="background:${C.forest};padding:26px 32px;font-family:${FONT};">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6ee7b7;font-weight:700;">&#x1F4B3; Paid booking &middot; confirmed automatically</div>
  <div style="font-family:${SERIF};font-size:28px;color:#ffffff;margin-top:8px;">${e(guestName)}</div>
  <div style="font-size:14px;color:#d6d3d1;margin-top:4px;">${e(formatDate(d.checkInDate, "short"))} &rarr; ${e(formatDate(d.checkOutDate, "short"))} &middot; ${n} night${n === 1 ? "" : "s"}</div>
</td></tr>
${
  d.attentionNote
    ? `<tr><td style="padding:22px 32px 0;font-family:${FONT};"><div style="background:${C.amberLight};color:${C.amber};border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;"><strong>Needs a look:</strong> ${e(d.attentionNote)}</div></td></tr>`
    : ""
}
<tr><td style="padding:18px 32px 4px;">${stayTicket(d)}</td></tr>
<tr><td style="padding:8px 32px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${detailRows(rows)}</table></td></tr>
<tr><td style="padding:20px 32px 30px;font-family:${FONT};">${button(adminUrl, "Open booking &rarr;")}</td></tr>`,
  );

  const text = [
    "PAID BOOKING (confirmed automatically)",
    ...(d.attentionNote ? ["", `NEEDS A LOOK: ${d.attentionNote}`] : []),
    "",
    `Guest: ${guestName}`,
    `Stay:  ${formatDate(d.checkInDate)} to ${formatDate(d.checkOutDate)} (${n} nights)`,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Open: ${adminUrl}`,
  ].join("\n");

  return {
    to: contact.alertEmail ?? contact.email,
    replyTo: d.guest.email,
    subject: oneLine(`${d.attentionNote ? "⚠️" : "💳"} Paid booking: ${guestName}, ${formatDate(d.checkInDate, "short")} (${n}n) · ${d.reference}`),
    html,
    text,
  };
}

export function renderPaidEmails(details: PaidBookingDetails, contact: ContactValues) {
  return { guest: guestEmail(details, contact), staff: staffEmail(details, contact) };
}

/** Loads what the emails need for a paid attempt. */
export async function loadPaidDetails(onlinePaymentId: string): Promise<PaidBookingDetails | null> {
  const attempt = await prisma.onlinePayment.findUnique({
    where: { id: onlinePaymentId },
    include: {
      reservation: {
        include: {
          guest: true,
          stays: { include: { roomAssignments: { include: { room: { include: { roomType: { select: { name: true } } } } } } } },
        },
      },
    },
  });
  if (!attempt) return null;
  const r = attempt.reservation;
  return {
    reservationId: r.id,
    reference: toBookingReference(r.id),
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    roomTypeNames: r.stays.flatMap((s) => s.roomAssignments.map((a) => a.room.roomType.name)),
    guest: { firstName: r.guest.firstName, lastName: r.guest.lastName, email: r.guest.email, phone: r.guest.phone },
    paidCents: attempt.amountCents,
    totalCents: await quoteReservationCents(r.id),
    currency: attempt.currency,
    kind: attempt.kind,
    card: attempt.cardBrand && attempt.cardLast4 ? `${attempt.cardBrand} •••• ${attempt.cardLast4}` : null,
    freeCancelUntil: attempt.freeCancelUntil,
    attentionNote: attempt.attentionNote,
  };
}

/** Confirmation to the guest and an alert to the desk. Never throws. */
export async function notifyBookingPaid(onlinePaymentId: string): Promise<void> {
  try {
    const details = await loadPaidDetails(onlinePaymentId);
    if (!details) return;
    const { contact } = await getSiteContent();
    const { guest, staff } = renderPaidEmails(details, contact);
    await Promise.all([sendEmail(staff), sendEmail(guest)]);
  } catch (error) {
    console.error("notifyBookingPaid failed:", error instanceof Error ? error.message : error);
  }
}

/**
 * The guest left the card page and kept the booking as a request: send the
 * ordinary "request received" emails, as if they had never tried to pay.
 */
export async function notifyRequestFromAttempt(onlinePaymentId: string): Promise<void> {
  try {
    const details = await loadPaidDetails(onlinePaymentId);
    if (!details) return;
    const { notifyBookingRequest } = await import("./booking-notifications");
    await notifyBookingRequest({
      reservationId: details.reservationId,
      reference: details.reference,
      checkInDate: details.checkInDate,
      checkOutDate: details.checkOutDate,
      roomTypeNames: details.roomTypeNames,
      guests: null,
      guest: details.guest,
    });
  } catch (error) {
    console.error("notifyRequestFromAttempt failed:", error instanceof Error ? error.message : error);
  }
}
