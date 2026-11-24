import { SITE, SITE_URL } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { sendEmail } from "./email.service";
import { C, FONT, SERIF, button, detailRows, digits, e, oneLine, shell } from "./email-layout";

export interface EnquiryDetails {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  travelDates: string | null;
  message: string;
}

/** Keeps the guest's line breaks, safely. */
function paragraphs(text: string): string {
  return e(text).replace(/\r?\n/g, "<br>");
}

export function renderEnquiryEmails(d: EnquiryDetails, contact: ContactValues) {
  const name = oneLine(d.name);
  const first = name.split(" ")[0] || name;
  const replySubject = `Re: ${d.subject}`;
  const adminUrl = `${SITE_URL}/admin/enquiries`;

  const staffHtml = shell(
    `${name}: ${d.message.slice(0, 90)}`,
    `
<tr><td style="background:${C.forest};padding:26px 32px;font-family:${FONT};">
  <img src="${SITE_URL}/email/logo.png" width="44" height="44" alt="Lily Resort Udawalawe" style="display:block;width:44px;height:44px;border-radius:999px;margin-bottom:14px;">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6ee7b7;font-weight:700;">&#x2709;&#xFE0F; New message &middot; ${e(d.subject)}</div>
  <div style="font-family:${SERIF};font-size:28px;color:#ffffff;margin-top:8px;">${e(name)}</div>
</td></tr>
<tr><td style="padding:24px 32px 6px;">
  <div style="background:${C.sand};border-radius:14px;padding:18px 20px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.ink};">${paragraphs(d.message)}</div>
</td></tr>
<tr><td style="padding:10px 32px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${detailRows([
      ["Email", d.email],
      ["Phone", d.phone ?? "Not given"],
      ...(d.travelDates ? ([["Dates", d.travelDates]] as [string, string][]) : []),
    ])}
  </table>
</td></tr>
<tr><td style="padding:20px 32px 30px;font-family:${FONT};">
  ${button(`mailto:${d.email}?subject=${encodeURIComponent(replySubject)}`, "&#x2709;&#xFE0F; Reply by email")}
  ${d.phone ? button(`https://wa.me/${digits(d.phone)}`, "&#x1F4AC; WhatsApp", "ghost") : ""}
  ${d.phone ? button(`tel:${d.phone.replace(/[^\d+]/g, "")}`, "&#x1F4DE; Call", "ghost") : ""}
  ${button(adminUrl, "All messages &rarr;", "ghost")}
  <p style="margin:10px 0 0;font-size:12px;color:${C.muted};">Hitting reply goes straight to ${e(first)}. Mark it replied in the admin panel afterwards.</p>
</td></tr>`,
  );

  const guestHtml = shell(
    `Thanks ${first}, we have your message and will reply soon.`,
    `
<tr><td style="padding:0;">
  <img src="${SITE_URL}/email/banner.jpg" width="600" alt="${e(SITE.name)}, the verandah at dusk" style="display:block;width:100%;max-width:600px;height:auto;border:0;">
</td></tr>
<tr><td style="padding:0 32px;">
  <img src="${SITE_URL}/email/logo.png" width="72" height="72" alt="Lily Resort Udawalawe" style="display:block;width:72px;height:72px;margin-top:-36px;border-radius:999px;border:4px solid #ffffff;background:#ffffff;">
</td></tr>
<tr><td style="padding:14px 32px 6px;font-family:${FONT};">
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.emerald};font-weight:700;">${e(SITE.name)}</div>
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-weight:normal;font-size:28px;line-height:1.2;color:${C.ink};">Thanks for writing, ${e(first)}! &#x1F33F;</h1>
  <p style="margin:14px 0 0;font-size:15px;line-height:1.6;color:#44403c;">
    Your message is with the team at the house. We usually reply within a day, often much sooner.
    If it's urgent, WhatsApp or call us.
  </p>
</td></tr>
<tr><td style="padding:18px 32px 6px;">
  <div style="font-family:${FONT};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};margin-bottom:8px;">You wrote</div>
  <div style="border-left:3px solid ${C.emerald};padding:4px 0 4px 14px;font-family:${FONT};font-size:14px;line-height:1.6;color:#44403c;">${paragraphs(d.message)}</div>
</td></tr>
<tr><td style="padding:20px 32px 30px;font-family:${FONT};">
  ${button(`https://wa.me/${digits(contact.phone)}`, "&#x1F4AC; WhatsApp us")}
  ${button(`tel:${contact.phone}`, `&#x1F4DE; ${e(contact.phoneDisplay)}`, "ghost")}
</td></tr>
<tr><td style="background:${C.forest};padding:20px 32px;font-family:${FONT};font-size:12px;line-height:1.6;color:#a8a29e;">
  <strong style="color:#ffffff;">${e(SITE.name)}</strong><br>
  ${e(contact.street)}, ${e(contact.locality)} ${e(contact.postalCode)}, Sri Lanka<br>
  <a href="${SITE_URL}" style="color:#6ee7b7;text-decoration:none;">${e(SITE_URL.replace(/^https?:\/\//, ""))}</a>
</td></tr>`,
  );

  return {
    staff: {
      to: contact.alertEmail ?? contact.email,
      replyTo: d.email,
      subject: oneLine(`✉️ ${d.subject}: ${name}`),
      html: staffHtml,
      text: [
        `New message from the website: ${d.subject}`,
        "",
        `From:  ${name}`,
        `Email: ${d.email}`,
        `Phone: ${d.phone ?? "Not given"}`,
        ...(d.travelDates ? [`Dates: ${d.travelDates}`] : []),
        "",
        d.message,
        "",
        `All messages: ${adminUrl}`,
        "Reply to this email to write to the guest.",
      ].join("\n"),
    },
    guest: {
      to: d.email,
      replyTo: contact.email,
      subject: `We got your message, ${first} 🌿`,
      html: guestHtml,
      text: [
        `Thanks for writing, ${first}!`,
        "",
        "Your message is with the team at the house. We usually reply within a day.",
        `If it's urgent, call or WhatsApp ${contact.phoneDisplay}.`,
        "",
        "You wrote:",
        d.message,
        "",
        `${SITE.name}, ${contact.street}, ${contact.locality}`,
      ].join("\n"),
    },
  };
}

/** Emails the inbox and the guest. Independent sends; never throws. */
export async function notifyEnquiry(details: EnquiryDetails): Promise<void> {
  const { contact } = await getSiteContent();
  const { staff, guest } = renderEnquiryEmails(details, contact);
  await Promise.all([sendEmail(staff), sendEmail(guest)]);
}
