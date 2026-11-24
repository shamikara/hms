"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/core/db/prisma";
import { SITE_URL } from "@/lib/seo/site";
import { NO_PROPERTY, requireAdminPermission, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { gatewayMode, isGatewayConfigured } from "../lib/payments-lk";
import { readPaymentSettings, savePaymentSettings } from "../services/payment-settings.service";
import { OnlinePaymentError, refundableCents, requestRefund, settleAttempt } from "../services/online-payment.service";
import { notifyBookingPaid } from "@/features/notifications/services/payment-notifications";
import { PaymentSettingsSchema, RefundSchema, type PaymentSettings } from "../validations/payment.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };
const firstIssue = (e: z.ZodError) => e.issues?.[0]?.message ?? "Please check the details and try again.";

export interface PaymentSettingsView extends PaymentSettings {
  keysConfigured: boolean;
  webhookConfigured: boolean;
  mode: "test" | "live" | null;
  webhookUrl: string;
}

export async function getPaymentSettings(): Promise<Result<PaymentSettingsView>> {
  const guard = await requireAdminPermission("settings:manage");
  if (!guard.ok) return guard.failure;
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { success: false, error: NO_PROPERTY };
  try {
    const settings = await readPaymentSettings(propertyId);
    return {
      success: true,
      data: {
        ...settings,
        keysConfigured: isGatewayConfigured(),
        webhookConfigured: Boolean(process.env.PAYMENTS_LK_WEBHOOK_SECRET?.trim()),
        mode: gatewayMode(),
        webhookUrl: `${SITE_URL}/api/payments/payments-lk`,
      },
    };
  } catch (error) {
    console.error("getPaymentSettings failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Payment settings could not be loaded." };
  }
}

export async function updatePaymentSettings(input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("settings:manage");
  if (!guard.ok) return guard.failure;
  const parsed = PaymentSettingsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  if (parsed.data.enabled && (!isGatewayConfigured() || !process.env.PAYMENTS_LK_WEBHOOK_SECRET?.trim())) {
    return {
      success: false,
      error: "Add PAYMENTS_LK_SECRET_KEY and PAYMENTS_LK_WEBHOOK_SECRET in Vercel (and redeploy) before switching online payment on.",
    };
  }
  const propertyId = await resolveDefaultPropertyId();
  if (!propertyId) return { success: false, error: NO_PROPERTY };
  try {
    await savePaymentSettings(propertyId, parsed.data);
    revalidatePath("/admin/settings");
    revalidatePath("/book");
    return { success: true };
  } catch (error) {
    console.error("updatePaymentSettings failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not save. Please try again." };
  }
}

/* ------------------------------------------------- booking detail */

export interface OnlinePaymentRow {
  id: string;
  status: string;
  kind: string;
  mode: string;
  amountCents: number;
  refundedCents: number;
  refundableCents: number;
  currency: string;
  card: string | null;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
  freeCancelUntil: string | null;
  withinFreeCancel: boolean | null;
  attentionNote: string | null;
  paymentId: string | null;
  refunds: { id: string; amountCents: number; status: string; reason: string | null; failureMessage: string | null; createdAt: string }[];
}

export async function listOnlinePayments(reservationId: string): Promise<Result<OnlinePaymentRow[]>> {
  const guard = await requireAdminPermission("finance:view");
  if (!guard.ok) return guard.failure;
  try {
    const rows = await prisma.onlinePayment.findMany({
      where: { reservationId },
      orderBy: { createdAt: "desc" },
      include: { refunds: { orderBy: { createdAt: "desc" } } },
    });
    const now = Date.now();
    const data = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        status: r.status,
        kind: r.kind,
        mode: r.mode,
        amountCents: r.amountCents,
        refundedCents: r.refundedCents,
        refundableCents: await refundableCents(r.id),
        currency: r.currency,
        card: r.cardBrand && r.cardLast4 ? `${r.cardBrand} •••• ${r.cardLast4}` : null,
        createdAt: r.createdAt.toISOString(),
        paidAt: r.paidAt?.toISOString() ?? null,
        expiresAt: r.expiresAt.toISOString(),
        freeCancelUntil: r.freeCancelUntil?.toISOString() ?? null,
        withinFreeCancel: r.freeCancelUntil ? now <= r.freeCancelUntil.getTime() : r.status === "SUCCEEDED" ? false : null,
        attentionNote: r.attentionNote,
        paymentId: r.paymentId,
        refunds: r.refunds.map((f) => ({
          id: f.id,
          amountCents: f.amountCents,
          status: f.status,
          reason: f.reason,
          failureMessage: f.failureMessage,
          createdAt: f.createdAt.toISOString(),
        })),
      })),
    );
    return { success: true, data };
  } catch (error) {
    console.error("listOnlinePayments failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Online payments could not be loaded." };
  }
}

export async function refundOnlinePayment(input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;
  const parsed = RefundSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  try {
    const attempt = await prisma.onlinePayment.findUnique({ where: { id: parsed.data.onlinePaymentId }, select: { reservationId: true } });
    if (!attempt) return { success: false, error: "That payment was not found." };
    await requestRefund({
      onlinePaymentId: parsed.data.onlinePaymentId,
      amountCents: Math.round(parsed.data.amount * 100),
      reason: parsed.data.reason,
      requestedById: guard.actor.userId,
    });
    revalidatePath(`/admin/bookings/${attempt.reservationId}`);
    return { success: true };
  } catch (error) {
    if (error instanceof OnlinePaymentError) return { success: false, error: error.message };
    console.error("refundOnlinePayment failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "The refund could not be sent. Please try again." };
  }
}

/** Re-reads an attempt from Payments.lk: for when a webhook seems to have gone missing. */
export async function recheckOnlinePayment(id: string): Promise<Result<{ state: string }>> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;
  if (!z.string().min(1).max(64).safeParse(id).success) return { success: false, error: "That payment was not found." };
  try {
    const attempt = await prisma.onlinePayment.findUnique({ where: { id }, select: { reservationId: true } });
    if (!attempt) return { success: false, error: "That payment was not found." };
    const outcome = await settleAttempt(id);
    if (outcome.state === "paid" && outcome.firstTime) await notifyBookingPaid(id);
    revalidatePath(`/admin/bookings/${attempt.reservationId}`);
    return { success: true, data: { state: outcome.state } };
  } catch (error) {
    console.error("recheckOnlinePayment failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Payments.lk could not be reached. Try again in a moment." };
  }
}
