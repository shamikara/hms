import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A small client for the Payments.lk REST API (https://payments.lk/developers/api).
 *
 * Only what the booking flow uses: hosted checkouts, reading them back, and
 * refunds. Plain fetch, so there is no SDK to keep up to date.
 *
 * Amounts are whole cents of the currency (Rs. 2,500.00 is 250000).
 */

const DEFAULT_API_BASE = "https://api.payments.lk";

export class PaymentsLkError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null,
  ) {
    super(message);
    this.name = "PaymentsLkError";
  }
}

export interface PlkPayment {
  object?: "payment";
  id: string;
  status: string;
  amountCents: number;
  currency?: string;
  reference?: string | null;
  checkoutId?: string | null;
  refundedCents?: number;
  card?: { scheme?: string | null; last4?: string | null } | null;
  failureMessage?: string | null;
}

export interface PlkCheckout {
  object?: "checkout";
  id: string;
  mode?: string;
  /** "open", "completed", "expired" ... */
  status: string;
  url: string;
  expiresAt?: string;
  payment?: PlkPayment | null;
}

export interface PlkRefund {
  object?: "refund";
  id: string;
  paymentId: string;
  status: string;
  amountCents: number;
  failureMessage?: string | null;
}

export interface PlkEvent {
  id: string;
  object?: "event";
  type: string;
  mode?: string;
  created?: number | string;
  data: Record<string, unknown>;
}

function secretKey(): string {
  const key = process.env.PAYMENTS_LK_SECRET_KEY?.trim();
  if (!key) throw new PaymentsLkError("Online payment is not set up (PAYMENTS_LK_SECRET_KEY is missing).", null, "not_configured");
  return key;
}

/** True once a secret key is set; the feature stays hidden until then. */
export function isGatewayConfigured(): boolean {
  return Boolean(process.env.PAYMENTS_LK_SECRET_KEY?.trim());
}

/** "test" or "live", read from the key. */
export function gatewayMode(): "test" | "live" | null {
  const key = process.env.PAYMENTS_LK_SECRET_KEY?.trim();
  if (!key) return null;
  return key.startsWith("sk_live_") ? "live" : "test";
}

function apiBase(): string {
  const base = (process.env.PAYMENTS_LK_API_BASE?.trim() || DEFAULT_API_BASE).replace(/\/+$/, "");
  // Plain http only for a local mock; the key must never cross the internet unencrypted.
  if (!base.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(base)) {
    throw new PaymentsLkError("PAYMENTS_LK_API_BASE must be an https URL.", null, "bad_config");
  }
  return base;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  idempotencyKey?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secretKey()}`,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";
  if (method === "POST") headers["Idempotency-Key"] = idempotencyKey ?? crypto.randomUUID();

  let lastError: unknown;
  // Network failures and 429/5xx are retried; the idempotency key makes a
  // repeated POST safe (the gateway answers the first result again).
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * attempt));
    let res: Response;
    try {
      res = await fetch(`${apiBase()}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
    } catch (error) {
      lastError = error;
      continue;
    }

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    if (res.ok) return json as T;

    const err = (json && typeof json === "object" && "error" in json ? (json as { error: unknown }).error : json) as
      | { message?: string; code?: string }
      | null;
    const message = (err && typeof err === "object" && typeof err.message === "string" && err.message) || `Payments.lk answered ${res.status}.`;
    const failure = new PaymentsLkError(message, res.status, (err && typeof err === "object" && typeof err.code === "string" && err.code) || null);
    if (res.status === 429 || res.status >= 500) {
      lastError = failure;
      continue;
    }
    throw failure;
  }
  if (lastError instanceof PaymentsLkError) throw lastError;
  throw new PaymentsLkError("Could not reach Payments.lk.", null, "network");
}

export const PaymentsLk = {
  createCheckout(
    params: {
      amountCents: number;
      currency: string;
      description: string;
      reference: string;
      customer: { name: string; email: string; phone?: string };
      successUrl: string;
      cancelUrl: string;
      expiresInMinutes: number;
    },
    idempotencyKey: string,
  ) {
    return request<PlkCheckout>("POST", "/v1/checkouts", params, idempotencyKey);
  },

  getCheckout(id: string) {
    return request<PlkCheckout>("GET", `/v1/checkouts/${encodeURIComponent(id)}`);
  },

  getPayment(id: string) {
    return request<PlkPayment>("GET", `/v1/payments/${encodeURIComponent(id)}`);
  },

  createRefund(params: { paymentId: string; amountCents: number; reason?: string }, idempotencyKey: string) {
    return request<PlkRefund>("POST", "/v1/refunds", params, idempotencyKey);
  },

  getRefund(id: string) {
    return request<PlkRefund>("GET", `/v1/refunds/${encodeURIComponent(id)}`);
  },
};

/**
 * Checks a webhook's Payments-Signature header and returns the parsed event.
 *
 * Header: `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`, with
 * several v1 values while a secret rotates. The raw body must be checked
 * exactly as received. Returns null for anything that does not verify.
 */
export function verifyWebhook(
  rawBody: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000),
): PlkEvent | null {
  if (!header || header.length > 1000 || !secret.startsWith("whsec_")) return null;

  let timestamp: string | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.trim().split("=", 2);
    if (key === "t" && /^\d{1,12}$/.test(value ?? "")) timestamp = value;
    else if (key === "v1" && /^[0-9a-f]{64}$/.test(value ?? "")) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return null;
  if (Math.abs(now - Number(timestamp)) > toleranceSeconds) return null;

  const expected = Buffer.from(createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex"), "utf8");
  const match = signatures.some((sig) => {
    const given = Buffer.from(sig, "utf8");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!match) return null;

  try {
    const event = JSON.parse(rawBody) as PlkEvent;
    if (!event || typeof event.id !== "string" || typeof event.type !== "string" || typeof event.data !== "object") return null;
    return event;
  } catch {
    return null;
  }
}

/** The resource an event carries: `data.object` per the API docs, `data` itself in older payloads. */
export function eventObject(event: PlkEvent): Record<string, unknown> {
  const inner = (event.data as { object?: unknown }).object;
  return inner && typeof inner === "object" ? (inner as Record<string, unknown>) : event.data;
}
