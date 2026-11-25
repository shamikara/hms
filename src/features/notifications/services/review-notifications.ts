import prisma from "@/core/db/prisma";
import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent, loadReviewLinks } from "@/features/site/services/site.service";
import type { ContactValues, ReviewLinks } from "@/features/site/validations/site.schema";
import { toBookingReference } from "@/features/bookings/lib/reference";
import { sendEmail } from "./email.service";
import { C, FONT, SERIF, button, e, oneLine, shell } from "./email-layout";

export interface ReviewEmailDetails {
  reference: string;
  guest: { firstName: string; email: string };
}

/** The buttons, in the order guests are most likely to have an account. */
export function reviewButtons(links: ReviewLinks): { label: string; href: string }[] {
  return [
    links.google ? { label: "Review us on Google", href: links.google } : null,
    links.bookingCom ? { label: "Review on Booking.com", href: links.bookingCom } : null,
    links.tripadvisor ? { label: "Review on Tripadvisor", href: links.tripadvisor } : null,
  ].filter((b): b is { label: string; href: string } => b !== null);
}

export function reviewRequestEmail(d: ReviewEmailDetails, links: ReviewLinks, contact: ContactValues) {
  const first = oneLine(d.guest.firstName) || "there";
  const buttons = reviewButtons(links);
  const html = shell(
    `Thank you for staying with us, ${first}. Would you share a few words?`,
    `
<tr><td style="padding:0;">
  <img src="${SITE_URL}/email/banner.jpg" width="600" alt="${e(SITE.name)}" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:24px 32px 8px;font-family:${FONT};">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.emerald};font-weight:700;">${e(SITE.name)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-weight:normal;font-size:30px;line-height:1.2;color:${C.ink};">How was your stay, ${e(first)}?</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    Thank you for staying with us in Udawalawe. We hope the elephants were kind to you and the
    beds were kinder.
  </p>
  <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    We're a small, family-run place, and most of our guests find us through reviews. If you have
    two minutes, a few honest words would mean a lot to the whole team.
  </p>
</td></tr>
<tr><td style="padding:18px 32px 6px;font-family:${FONT};">
  ${buttons.map((b, i) => button(b.href, e(b.label), i === 0 ? "primary" : "ghost")).join("\n  ")}
</td></tr>
<tr><td style="padding:10px 32px 28px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">
  Something we should have done better? Just reply to this email. It comes straight to us, and we read every one.
</td></tr>
<tr><td style="background:${C.forest};padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:#a8a29e;">
  <strong style="color:#ffffff;">${e(SITE.name)}</strong> &middot; booking ${e(d.reference)}<br>
  ${e(contact.street)}, ${e(contact.locality)}, Sri Lanka
</td></tr>`,
  );
  const text = [
    `How was your stay, ${first}?`,
    "",
    "Thank you for staying with us in Udawalawe. We're a small, family-run place and most guests find us through reviews.",
    "If you have two minutes, a few honest words would mean a lot:",
    "",
    ...buttons.map((b) => `${b.label}: ${b.href}`),
    "",
    "Something we should have done better? Just reply to this email.",
    "",
    `${SITE.name} · booking ${d.reference}`,
  ].join("\n");
  return {
    to: d.guest.email,
    replyTo: contact.email,
    subject: `Thank you for staying with us, ${first}`,
    html,
    text,
  };
}

/**
 * Sends the after-stay review request once per booking. Never throws.
 *
 * The booking is claimed (reviewRequestSentAt set) before sending, so two
 * check-out clicks can't send two emails. If sending then fails the claim is
 * released, so a later check-out attempt or a manual resend can try again.
 */
export async function notifyReviewRequest(reservationId: string): Promise<void> {
  try {
    const r = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, propertyId: true, reviewRequestSentAt: true, guest: { select: { firstName: true, email: true } } },
    });
    if (!r || r.reviewRequestSentAt || !r.guest.email) return;

    const links = await loadReviewLinks(r.propertyId);
    if (!links.enabled || reviewButtons(links).length === 0) return;

    const claimed = await prisma.reservation.updateMany({
      where: { id: r.id, reviewRequestSentAt: null },
      data: { reviewRequestSentAt: new Date() },
    });
    if (claimed.count === 0) return;

    const { contact } = await getSiteContent();
    const result = await sendEmail(
      reviewRequestEmail({ reference: toBookingReference(r.id), guest: r.guest }, links, contact),
    );
    if (!result.sent) {
      await prisma.reservation.update({ where: { id: r.id }, data: { reviewRequestSentAt: null } });
    }
  } catch (error) {
    console.error("notifyReviewRequest failed:", error instanceof Error ? error.message : error);
  }
}
