import { SITE } from "@/lib/seo/site";
import { escapeHtml } from "./email.service";

/**
 * The shared look of every email the site sends: colours, the page shell,
 * buttons and detail tables. Tables and inline styles throughout, because
 * Outlook and Gmail ignore most modern CSS.
 */

/** Subjects are a single line; a pasted newline in a name must not break one. */
export function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** Digits only, for wa.me links, which take no "+" or spaces. */
export function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export const e = escapeHtml;

/* --------------------------------------------------------------- design */

export const C = {
  forest: "#13291f",
  emerald: "#047857",
  emeraldLight: "#d1fae5",
  sand: "#f6f1e8",
  ink: "#1c1917",
  muted: "#78716c",
  line: "#e7e5e4",
  amber: "#b45309",
  amberLight: "#fef3c7",
};

export const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const SERIF = "Georgia,'Times New Roman',serif";

/**
 * Email-safe page shell: tables and inline styles, because Outlook and Gmail
 * ignore most modern CSS. `preheader` is the grey preview line inbox lists
 * show next to the subject.
 */
export function shell(preheader: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(SITE.name)}</title></head>
<body style="margin:0;padding:0;background:${C.sand};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(28,25,23,0.08);">
${body}
</table>
<p style="margin:18px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">${e(SITE.name)} · Udawalawe, Sri Lanka</p>
</td></tr></table>
</body></html>`;
}

export function button(href: string, label: string, kind: "primary" | "ghost" = "primary"): string {
  const style =
    kind === "primary"
      ? `background:${C.emerald};color:#ffffff;border:1px solid ${C.emerald};`
      : `background:#ffffff;color:${C.ink};border:1px solid ${C.line};`;
  return `<a href="${e(href)}" style="${style}display:inline-block;padding:12px 20px;border-radius:999px;font-family:${FONT};font-size:14px;font-weight:600;text-decoration:none;margin:0 6px 8px 0;">${label}</a>`;
}

export function detailRows(pairs: [string, string][]): string {
  return pairs
    .map(
      ([k, v]) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:13px;color:${C.muted};width:38%;">${e(k)}</td>
        <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${FONT};font-size:14px;color:${C.ink};font-weight:600;">${e(v)}</td>
      </tr>`,
    )
    .join("");
}

