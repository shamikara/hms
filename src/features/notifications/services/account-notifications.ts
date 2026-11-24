import { SITE, SITE_URL } from "@/lib/seo/site";
import { sendEmail } from "./email.service";
import { C, FONT, SERIF, button, e, oneLine, shell } from "./email-layout";

function header(title: string, intro: string) {
  return `
<tr><td style="background:${C.forest};padding:26px 32px;font-family:${FONT};">
  <img src="${SITE_URL}/email/logo.png" width="48" height="48" alt="Lily Resort Udawalawe" style="display:block;width:48px;height:48px;border-radius:999px;margin-bottom:14px;">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#6ee7b7;font-weight:700;">${e(SITE.name)}</div>
  <div style="font-family:${SERIF};font-size:26px;color:#ffffff;margin-top:8px;">${title}</div>
</td></tr>
<tr><td style="padding:24px 32px 4px;font-family:${FONT};font-size:15px;line-height:1.6;color:#44403c;">${intro}</td></tr>`;
}

const FOOT = `
<tr><td style="padding:6px 32px 28px;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
  Didn't ask for this? You can ignore this email; nothing changes on your account.
</td></tr>`;

export function verifyEmail(to: string, firstName: string, token: string) {
  const link = `${SITE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  const name = oneLine(firstName) || "there";
  return {
    to,
    subject: `Confirm your email for ${SITE.name}`,
    html: shell(
      "One click to finish setting up your account.",
      `${header(`Welcome, ${e(name)}! &#x1F33F;`, "Please confirm this is your email address to finish creating your account. The link works for 24 hours.")}
<tr><td style="padding:18px 32px 10px;font-family:${FONT};">${button(link, "Confirm my email &rarr;")}</td></tr>
<tr><td style="padding:0 32px 10px;font-family:${FONT};font-size:12px;color:${C.muted};word-break:break-all;">Or paste this into your browser: ${e(link)}</td></tr>
${FOOT}`,
    ),
    text: `Welcome, ${name}!\n\nConfirm your email to finish creating your ${SITE.name} account (link valid for 24 hours):\n${link}\n\nDidn't ask for this? Ignore this email.`,
  };
}

export function alreadyRegistered(to: string, firstName: string) {
  const name = oneLine(firstName) || "there";
  return {
    to,
    subject: `You already have a ${SITE.name} account`,
    html: shell(
      "Someone tried to sign up with this email.",
      `${header(`Hello ${e(name)}`, "Someone, probably you, tried to create an account with this email address, but you already have one. Sign in instead, or reset your password if you have forgotten it.")}
<tr><td style="padding:18px 32px 10px;font-family:${FONT};">
  ${button(`${SITE_URL}/login`, "Sign in")}
  ${button(`${SITE_URL}/forgot-password`, "Reset password", "ghost")}
</td></tr>
${FOOT}`,
    ),
    text: `Hello ${name},\n\nSomeone tried to create an account with this email, but you already have one.\nSign in: ${SITE_URL}/login\nForgot your password? ${SITE_URL}/forgot-password\n\nDidn't ask for this? Ignore this email.`,
  };
}

export function resetCode(to: string, firstName: string, code: string) {
  const name = oneLine(firstName) || "there";
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    to,
    subject: `${code} is your ${SITE.name} reset code`,
    html: shell(
      `Your password reset code: ${spaced}. It works for 15 minutes.`,
      `${header(`Your reset code`, `Hello ${e(name)}, enter this code on the website to choose a new password. It works for 15 minutes.`)}
<tr><td align="center" style="padding:20px 32px 8px;">
  <div style="display:inline-block;background:${C.sand};border-radius:16px;padding:18px 28px;font-family:'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:${C.forest};">${e(spaced)}</div>
</td></tr>
<tr><td style="padding:10px 32px 4px;font-family:${FONT};font-size:13px;color:${C.muted};text-align:center;">Never share this code. Our team will never ask you for it.</td></tr>
${FOOT}`,
    ),
    text: `Hello ${name},\n\nYour ${SITE.name} password reset code is: ${spaced}\nIt works for 15 minutes. Never share it; our team will never ask you for it.\n\nDidn't ask for this? Ignore this email; your password stays the same.`,
  };
}

/** Fire-and-forget wrappers; sendEmail already never throws. */
export const AccountEmails = {
  sendVerify: (to: string, firstName: string, token: string) => sendEmail(verifyEmail(to, firstName, token)),
  sendAlreadyRegistered: (to: string, firstName: string) => sendEmail(alreadyRegistered(to, firstName)),
  sendResetCode: (to: string, firstName: string, code: string) => sendEmail(resetCode(to, firstName, code)),
};
