import prisma from "@/core/db/prisma";
import { isGatewayConfigured } from "../lib/payments-lk";
import { DEFAULT_PAYMENT_SETTINGS, PaymentSettingsSchema, type PaymentSettings } from "../validations/payment.schema";

export const PAYMENT_SETTINGS_KEY = "payments.online";

export async function readPaymentSettings(propertyId: string): Promise<PaymentSettings> {
  const row = await prisma.setting.findFirst({
    where: { propertyId, key: PAYMENT_SETTINGS_KEY },
    select: { value: true },
  });
  const parsed = PaymentSettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : DEFAULT_PAYMENT_SETTINGS;
}

export async function savePaymentSettings(propertyId: string, settings: PaymentSettings) {
  await prisma.setting.upsert({
    where: { propertyId_key: { propertyId, key: PAYMENT_SETTINGS_KEY } },
    update: { value: settings },
    create: { level: "PROPERTY", propertyId, key: PAYMENT_SETTINGS_KEY, value: settings },
  });
}

/** What the booking page needs to offer paying now. */
export interface PublicPaymentOptions {
  payNow: boolean;
  advancePercent: number;
  freeCancelDays: number;
  /** Tax added to room rates, so the estimate on screen matches the charge. */
  taxPercent: number | null;
}

export async function publicPaymentOptions(propertyId: string): Promise<PublicPaymentOptions> {
  const [settings, tax] = await Promise.all([
    readPaymentSettings(propertyId),
    prisma.setting.findFirst({ where: { propertyId, key: "billing.taxPercent" }, select: { value: true } }),
  ]);
  const rawTax = tax?.value;
  const taxNumber = typeof rawTax === "number" ? rawTax : typeof rawTax === "string" ? Number(rawTax) : NaN;
  return {
    payNow: settings.enabled && isGatewayConfigured(),
    advancePercent: settings.advancePercent,
    freeCancelDays: settings.freeCancelDays,
    taxPercent: Number.isFinite(taxNumber) && taxNumber >= 0 ? taxNumber : null,
  };
}

/** Last moment a guest can cancel for a full refund; null when the policy has no free period. */
export function freeCancelDeadline(checkInDate: Date, freeCancelDays: number): Date | null {
  if (freeCancelDays <= 0) return null;
  // Check-in is stored as UTC midnight of the day; the cut-off is the end of
  // the day N days before, Sri Lanka time (UTC+5:30).
  const d = new Date(checkInDate.getTime() - freeCancelDays * 86_400_000);
  return new Date(d.getTime() + 86_400_000 - 1 - 5.5 * 3_600_000);
}
