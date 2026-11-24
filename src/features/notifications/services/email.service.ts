/**
 * Outbound email through Resend's HTTP API.
 *
 * Plain fetch rather than the SDK: one endpoint, no extra dependency. Needs
 * RESEND_API_KEY and RESEND_FROM; the sending domain must be verified at
 * resend.com first or every send is rejected.
 *
 * Never throws. Email is a side effect of something that has already
 * happened (a booking was stored); failing to send must not undo it or show
 * the guest an error. Failures are logged and reported in the return value.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type SendResult = { sent: true } | { sent: false; reason: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

/** True when the environment has what sending needs. */
export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.warn(
      `Email not sent ("${message.subject}"): RESEND_API_KEY and RESEND_FROM must both be set.`,
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      // Resend's error body names the problem (unverified domain, bad key)
      // without echoing the key, so it is safe and useful to log.
      const detail = await response.text().catch(() => "");
      console.error(`Email to ${message.to} rejected (${response.status}): ${detail.slice(0, 300)}`);
      return { sent: false, reason: `http-${response.status}` };
    }
    return { sent: true };
  } catch (error) {
    console.error(
      `Email to ${message.to} failed:`,
      error instanceof Error ? error.message : error,
    );
    return { sent: false, reason: "network" };
  }
}

/** Escapes text for interpolation into HTML. Every guest-typed value goes through this. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
