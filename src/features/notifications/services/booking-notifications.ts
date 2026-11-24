import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import { escapeHtml, sendEmail } from "./email.service";

export interface BookingRequestDetails {
  reservationId: string;
  reference: string;
  checkInDate: Date;
  checkOutDate: Date;
  roomTypeNames: string[];
  guests: number | null;
  guest: { firstName: string; lastName: string; email: string; phone: string | null };
}

/**
 * Stay dates are stored as UTC midnight of the calendar day the guest picked,
 * so they are formatted in UTC: formatting in a local zone west of UTC would
 * show every date a day early.
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function nights(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000);
}

/** Subjects are a single line; a pasted newline in a name must not break one. */
function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function rows(pairs: [string, string][]): { html: string; text: string } {
  return {
    html: pairs
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#78716c;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;color:#1c1917">${escapeHtml(v)}</td></tr>`,
      )
      .join(""),
    text: pairs.map(([k, v]) => `${k}: ${v}`).join("\n"),
  };
}

function wrap(body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f5f4;font-family:Georgia,serif"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:#1c1917">${body}</div></body></html>`;
}

/**
 * Tells the reservations inbox a request has come in, and tells the guest it
 * was received. Both are sent independently: one failing does not stop the
 * other. Never throws.
 */
export async function notifyBookingRequest(details: BookingRequestDetails): Promise<void> {
  const { contact } = await getSiteContent();
  const staffInbox = contact.alertEmail ?? contact.email;

  const guestName = oneLine(`${details.guest.firstName} ${details.guest.lastName}`);
  const stay = `${formatDate(details.checkInDate)} to ${formatDate(details.checkOutDate)} (${nights(details.checkInDate, details.checkOutDate)} nights)`;
  const rooms = details.roomTypeNames.join(", ");
  const adminUrl = `${SITE_URL}/admin/bookings/${encodeURIComponent(details.reservationId)}`;

  const staffRows = rows([
    ["Reference", details.reference],
    ["Guest", guestName],
    ["Email", details.guest.email],
    ["Phone", details.guest.phone ?? "Not given"],
    ["Stay", stay],
    ["Rooms", rooms],
    ...(details.guests ? ([["Guests", String(details.guests)]] as [string, string][]) : []),
  ]);

  const staffEmail = sendEmail({
    to: staffInbox,
    replyTo: details.guest.email,
    subject: oneLine(`New booking request ${details.reference}: ${guestName}, ${formatDate(details.checkInDate)}`),
    html: wrap(
      `<h2 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal">New booking request</h2>
       <p style="margin:0 0 16px">The room is held as a <strong>draft</strong>. Confirm or cancel it with the guest.</p>
       <table style="border-collapse:collapse;margin-bottom:20px">${staffRows.html}</table>
       <p style="margin:0"><a href="${escapeHtml(adminUrl)}" style="color:#047857">Open in the admin panel</a></p>
       <p style="margin:16px 0 0;color:#78716c;font-size:12px">Reply to this email to write to the guest.</p>`,
    ),
    text: `New booking request (held as a draft until you confirm it)\n\n${staffRows.text}\n\nOpen: ${adminUrl}\n\nReply to this email to write to the guest.`,
  });

  const guestRows = rows([
    ["Reference", details.reference],
    ["Stay", stay],
    ["Rooms", rooms],
  ]);

  const guestEmail = sendEmail({
    to: details.guest.email,
    replyTo: contact.email,
    subject: `We have your booking request (${details.reference})`,
    html: wrap(
      `<h2 style="margin:0 0 12px;font-family:Georgia,serif;font-weight:normal">Thank you, ${escapeHtml(oneLine(details.guest.firstName))}</h2>
       <p style="margin:0 0 16px">We have your request and are holding the room while we check the details. <strong>It is not confirmed yet</strong> &mdash; we will be in touch to confirm it with you.</p>
       <table style="border-collapse:collapse;margin-bottom:20px">${guestRows.html}</table>
       <p style="margin:0">Questions? Reply to this email or call ${escapeHtml(contact.phoneDisplay)}.</p>
       <p style="margin:16px 0 0;color:#78716c;font-size:12px">${escapeHtml(SITE.name)}, ${escapeHtml(contact.street)}, ${escapeHtml(contact.locality)}</p>`,
    ),
    text: `Thank you, ${oneLine(details.guest.firstName)}.\n\nWe have your request and are holding the room while we check the details. It is not confirmed yet; we will be in touch to confirm it with you.\n\n${guestRows.text}\n\nQuestions? Reply to this email or call ${contact.phoneDisplay}.\n\n${SITE.name}, ${contact.street}, ${contact.locality}`,
  });

  await Promise.all([staffEmail, guestEmail]);
}
