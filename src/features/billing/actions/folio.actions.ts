"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { LineItemCategory, PaymentMethod } from "@prisma/client";
import prisma from "@/core/db/prisma";
import { requireAdminPermission } from "@/features/admin/lib/requireAdminSession";
import {
  Folio,
  FolioError,
  TAX_SETTING_KEY,
  addCharge,
  closeFolio,
  getFolio,
  postRoomCharges,
  recordPayment,
} from "../services/folio.service";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

/**
 * Turns a service failure into something the desk can read.
 *
 * FolioError messages are written for the person at the desk and are safe to
 * show. Anything else is a fault, and Prisma's own text names tables and
 * columns, so it goes to the log and not to the screen.
 */
function toResult(context: string, error: unknown): Result<never> {
  if (error instanceof FolioError) return { success: false, error: error.message };
  if (error instanceof z.ZodError) {
    return { success: false, error: error.issues?.[0]?.message ?? "Check the details and try again." };
  }
  console.error(`${context} failed:`, error instanceof Error ? error.message : error);
  return { success: false, error: "That did not save. Please try again." };
}

const ChargeSchema = z.object({
  category: z.nativeEnum(LineItemCategory),
  description: z.string().trim().min(2, "Say what the charge is for").max(200),
  amount: z.coerce.number().positive("Amount must be more than zero").max(10_000_000),
});

const PaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be more than zero").max(10_000_000),
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
});

const TaxSchema = z.object({
  taxPercent: z.coerce.number().min(0, "Tax cannot be negative").max(100),
});

export async function loadFolio(reservationId: string): Promise<Result<Folio>> {
  const guard = await requireAdminPermission("finance:view");
  if (!guard.ok) return guard.failure;

  try {
    return { success: true, data: await getFolio(reservationId) };
  } catch (error) {
    return toResult("loadFolio", error);
  }
}

export async function postRoomChargesAction(reservationId: string): Promise<Result> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;

  try {
    await postRoomCharges(reservationId);
    revalidatePath(`/admin/bookings/${reservationId}`);
    return { success: true };
  } catch (error) {
    return toResult("postRoomCharges", error);
  }
}

export async function addChargeAction(reservationId: string, input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;

  try {
    const parsed = ChargeSchema.parse(input);
    await addCharge(reservationId, parsed);
    revalidatePath(`/admin/bookings/${reservationId}`);
    return { success: true };
  } catch (error) {
    return toResult("addCharge", error);
  }
}

export async function recordPaymentAction(reservationId: string, input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;

  try {
    const parsed = PaymentSchema.parse(input);
    await recordPayment(reservationId, parsed);
    revalidatePath(`/admin/bookings/${reservationId}`);
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (error) {
    return toResult("recordPayment", error);
  }
}

export async function closeFolioAction(reservationId: string): Promise<Result> {
  const guard = await requireAdminPermission("billing:manage");
  if (!guard.ok) return guard.failure;

  try {
    await closeFolio(reservationId);
    revalidatePath(`/admin/bookings/${reservationId}`);
    revalidatePath("/admin/finance");
    return { success: true };
  } catch (error) {
    return toResult("closeFolio", error);
  }
}

/**
 * Sets the property's tax rate.
 *
 * Kept behind rooms:manage rather than billing:manage: the desk settles bills,
 * but what rate of tax the property charges is a management decision.
 */
export async function setTaxPercentAction(propertyId: string, input: unknown): Promise<Result> {
  const guard = await requireAdminPermission("rooms:manage");
  if (!guard.ok) return guard.failure;

  try {
    const parsed = TaxSchema.parse(input);
    const existing = await prisma.setting.findFirst({
      where: { propertyId, key: TAX_SETTING_KEY },
      select: { id: true },
    });

    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: parsed.taxPercent },
      });
    } else {
      await prisma.setting.create({
        data: {
          level: "PROPERTY",
          propertyId,
          key: TAX_SETTING_KEY,
          value: parsed.taxPercent,
        },
      });
    }

    revalidatePath("/admin/rooms");
    return { success: true };
  } catch (error) {
    return toResult("setTaxPercent", error);
  }
}
