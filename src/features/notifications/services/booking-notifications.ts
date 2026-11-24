import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { sendEmail } from "./email.service";
import { C, FONT, SERIF, button, detailRows, digits, e, oneLine, shell } from "./email-layout";

export interface BookingRequestDetails {
  reservationId: string;
  reference: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomTypeNames: string[];
  guests: number | null;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
}

/* ------------------------------------------------------------- helpers */

/**
 * Stay dates are stored as UTC midnight of the calendar day the guest picked,
 * so they are formatted in UTC: formatting in a local zone west of UTC would
 * show every date a day early.
 */
export function formatDate(date: Date, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: style === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(date);
}

function nights(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

/** Check-in → check-out as two boxes with the nights between, like a ticket. */
export function stayTicket(d: Pick<BookingRequestDetails, "checkInDate" | "checkOutDate">): string {
  const n = nights(d.checkInDate, d.checkOutDate);
  const box = (label: string, date: Date) => `
    <td width="42%" style="background:${C.sand};border-radius:14px;padding:14px 16px;">
      <div style="font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">${label}</div>
      <div style="font-family:${SERIF};font-size:20px;color:${C.ink};margin-top:4px;">${e(formatDate(date, "short"))}</div>
      <div style="font-family:${FONT};font-size:12px;color:${C.muted};">${date.getUTCFullYear()}</div>
    </td>`;
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    ${box("Check in", d.checkInDate)}
    <td width="16%" align="center" style="font-family:${FONT};font-size:12px;color:${C.emerald};font-weight:700;">
      &rarr;<br>${n} night${n === 1 ? "" : "s"}
    </td>
    ${box("Check out", d.checkOutDate)}
  </tr></table>`;
}

/* ---------------------------------------------------------- guest email */

function guestEmail(d: BookingRequestDetails, contact: ContactValues) {
  const first = oneLine(d.guest.firstName);
  const rooms = d.roomTypeNames.join(", ");
  const n = nights(d.checkInDate, d.checkOutDate);
  const wa = `https://wa.me/${digits(contact.phone)}?text=${encodeURIComponent(`Hello! About my booking request ${d.reference}`)}`;

  const step = (num: number, title: string, text: string) => `
    <tr>
      <td width="40" valign="top" style="padding:0 0 16px;">
        <div style="width:28px;height:28px;border-radius:999px;background:${C.emeraldLight};color:${C.emerald};font-family:${FONT};font-size:13px;font-weight:700;text-align:center;line-height:28px;">${num}</div>
      </td>
      <td valign="top" style="padding:3px 0 16px;font-family:${FONT};">
        <div style="font-size:14px;font-weight:600;color:${C.ink};">${title}</div>
        <div style="font-size:13px;color:${C.muted};line-height:1.5;margin-top:2px;">${text}</div>
      </td>
    </tr>`;

  const html = shell(
    `Your request ${d.reference} for ${formatDate(d.checkInDate, "short")} is in. We'll confirm with you shortly.`,
    `
<tr><td style="padding:0;">
  <img src="${SITE_URL}/email/banner.jpg" width="600" alt="${e(SITE.name)}, the verandah at dusk" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:0 32px;">
  <img src="${SITE_URL}/email/logo.png" width="72" height="72" alt="Lily Resort Udawalawe" style="display:block;width:72px;height:72px;margin-top:-36px;border-radius:999px;border:4px solid #ffffff;background:#ffffff;">
</td></tr>
<tr><td style="padding:14px 32px 8px;font-family:${FONT};">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.emerald};font-weight:700;">${e(SITE.name)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.2;color:${C.ink};">Ayubowan, ${e(first)}! &#x1F418;</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    Thank you for choosing us. Your request is in and we are holding the room while we check
    the details. The elephants have been told. &#x1F33F;
  </p>
  <div style="margin-top:16px;display:inline-block;background:${C.amberLight};color:${C.amber};border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;">
    &#x23F3; Request received &middot; not confirmed yet
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${detailRows([
          ["Room" + (d.roomTypeNames.length > 1 ? "s" : ""), rooms],
          ...(d.guests ? ([["Guests", `${d.guests} adult${d.guests === 1 ? "" : "s"}`]] as [string, string][]) : []),
          ["Stay", `${n} night${n === 1 ? "" : "s"}`],
        ])}
      </table>
    </td></tr>
  </table>
</td></tr>

<tr><td style="padding:24px 32px 4px;">
  <div style="font-family:${SERIF};font-size:20px;color:${C.ink};margin-bottom:14px;">What happens next</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${step(1, "We check the details", "Someone from the house looks over your dates and rooms.")}
    ${step(2, "We confirm with you", "By email or phone. Your booking is only confirmed once we have.")}
    ${step(3, "Pack the binoculars", "Udawalawe's elephants are waiting. Ask us about a safari drive.")}
  </table>
</td></tr>

<tr><td style="padding:8px 32px 30px;font-family:${FONT};">
  <p style="margin:0 0 14px;font-size:14px;color:#44403c;">Questions, or need to change something? We're happy to help.</p>
  ${button(wa, "&#x1F4AC; WhatsApp us")}
  ${button(`tel:${contact.phone}`, `&#x1F4DE; ${e(contact.phoneDisplay)}`, "ghost")}
</td></tr>

<tr><td style="background:${C.forest};padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:#a8a29e;">
  <strong style="color:#ffffff;">${e(SITE.name)}</strong><br>
  ${e(contact.street)}, ${e(contact.locality)} ${e(contact.postalCode)}, Sri Lanka<br>
  <a href="${SITE_URL}" style="color:#6ee7b7;text-decoration:none;">${e(SITE_URL.replace(/^https?:\/\//, ""))}</a>
</td></tr>`,
  );

  const text = [
    `Ayubowan, ${first}!`,
    "",
    "Thank you for choosing us. Your request is in and we are holding the room while we check the details.",
    "It is NOT confirmed yet. We will be in touch to confirm it with you.",
    "",
    `Reference: ${d.reference}`,
    `Check in:  ${formatDate(d.checkInDate)}`,
    `Check out: ${formatDate(d.checkOutDate)} (${n} night${n === 1 ? "" : "s"})`,
    `Rooms:     ${rooms}`,
    ...(d.guests ? [`Guests:    ${d.guests}`] : []),
    "",
    `Questions? Reply to this email, call ${contact.phoneDisplay}, or WhatsApp ${wa}`,
    "",
    `${SITE.name}, ${contact.street}, ${contact.locality}`,
  ].join("\n");

  return {
    to: d.guest.email,
    replyTo: contact.email,
    subject: `We've got your booking request, ${first}! 🐘 (${d.reference})`,
    html,
    text,
  };
}

/* ---------------------------------------------------------- staff email */

function staffEmail(d: BookingRequestDetails, contact: ContactValues) {
  const guestName = oneLine(`${d.guest.firstName} ${d.guest.lastName}`);
  const rooms = d.roomTypeNames.join(", ");
  const adminUrl = `${SITE_URL}/admin/bookings/${encodeURIComponent(d.reservationId)}`;
  const n = nights(d.checkInDate, d.checkOutDate);

  const html = shell(
    `${guestName} · ${formatDate(d.checkInDate, "short")} · ${n} night${n === 1 ? "" : "s"} · ${rooms}`,
    `
<tr><td style="background:${C.forest};padding:26px 32px;font-family:${FONT};">
  <img src="${SITE_URL}/email/logo.png" width="44" height="44" alt="Lily Resort Udawalawe" style="display:block;width:44px;height:44px;border-radius:999px;margin-bottom:14px;">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6ee7b7;font-weight:700;">&#x1F514; New booking request</div>
  <div style="font-family:${SERIF};font-size:28px;color:#ffffff;margin-top:8px;">${e(guestName)}</div>
  <div style="font-size:14px;color:#d6d3d1;margin-top:4px;">${e(formatDate(d.checkInDate, "short"))} &rarr; ${e(formatDate(d.checkOutDate, "short"))} &middot; ${n} night${n === 1 ? "" : "s"}</div>
</td></tr>

<tr><td style="padding:22px 32px 0;font-family:${FONT};">
  <div style="background:${C.amberLight};color:${C.amber};border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;">
    <strong>Held as a draft.</strong> The room is blocked until you confirm or cancel it, so please reply to the guest soon.
  </div>
</td></tr>

<tr><td style="padding:18px 32px 4px;">${stayTicket(d)}</td></tr>

<tr><td style="padding:8px 32px 6px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${detailRows([
      ["Reference", d.reference],
      ["Rooms", rooms],
      ...(d.guests ? ([["Guests", String(d.guests)]] as [string, string][]) : []),
      ["Email", d.guest.email],
      ["Phone", d.guest.phone ?? "Not given"],
    ])}
  </table>
</td></tr>

<tr><td style="padding:20px 32px 30px;font-family:${FONT};">
  ${button(adminUrl, "Open booking &rarr;")}
  ${button(`mailto:${d.guest.email}?subject=${encodeURIComponent(`Your booking request ${d.reference}`)}`, "&#x2709;&#xFE0F; Email guest", "ghost")}
  ${d.guest.phone ? button(`tel:${d.guest.phone.replace(/[^\d+]/g, "")}`, "&#x1F4DE; Call", "ghost") : ""}
  ${d.guest.phone ? button(`https://wa.me/${digits(d.guest.phone)}`, "&#x1F4AC; WhatsApp", "ghost") : ""}
  <p style="margin:10px 0 0;font-size:12px;color:${C.muted};">Or just hit reply: it goes straight to the guest.</p>
</td></tr>`,
  );

  const text = [
    "NEW BOOKING REQUEST (held as a draft until you confirm it)",
    "",
    `Guest:     ${guestName}`,
    `Email:     ${d.guest.email}`,
    `Phone:     ${d.guest.phone ?? "Not given"}`,
    `Reference: ${d.reference}`,
    `Stay:      ${formatDate(d.checkInDate)} to ${formatDate(d.checkOutDate)} (${n} nights)`,
    `Rooms:     ${rooms}`,
    ...(d.guests ? [`Guests:    ${d.guests}`] : []),
    "",
    `Open: ${adminUrl}`,
    "Reply to this email to write to the guest.",
  ].join("\n");

  return {
    to: contact.alertEmail ?? contact.email,
    replyTo: d.guest.email,
    subject: oneLine(`🔔 New booking: ${guestName}, ${formatDate(d.checkInDate, "short")} (${n}n) · ${d.reference}`),
    html,
    text,
  };
}

/* ---------------------------------------------------------------- send */

/** Exposed so the templates can be previewed without sending anything. */
export function renderBookingEmails(details: BookingRequestDetails, contact: ContactValues) {
  return { guest: guestEmail(details, contact), staff: staffEmail(details, contact) };
}

/**
 * Tells the reservations inbox a request has come in, and tells the guest it
 * was received. Both are sent independently: one failing does not stop the
 * other. Never throws.
 */
export async function notifyBookingRequest(details: BookingRequestDetails): Promise<void> {
  const { contact } = await getSiteContent();
  const { guest, staff } = renderBookingEmails(details, contact);
  await Promise.all([sendEmail(staff), sendEmail(guest)]);
}
