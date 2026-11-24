"use server";

import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { EnquiryStatus } from "@prisma/client";
import prisma from "@/core/db/prisma";
import { ENQUIRY_RULE, callerAddress, consumeRateLimit, describeWait } from "@/core/security/rateLimit";
import { NO_PROPERTY, requireAdminPermission, resolveDefaultPropertyId } from "@/features/admin/lib/requireAdminSession";
import { notifyEnquiry } from "@/features/notifications/services/enquiry-notifications";
import { EnquiryService, type EnquiryRow } from "../services/enquiry.service";
import { EnquirySchema } from "../validations/enquiry.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

function firstIssue(error: z.ZodError): string {
  return error.issues?.[0]?.message ?? "Please check the details and try again.";
}

const UNAVAILABLE =
  "Your message could not be sent just now. Please try again in a moment, or call or WhatsApp us.";

/** The public contact form. */
export async function submitEnquiry(input: unknown): Promise<Result> {
  const parsed = EnquirySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };

  // A bot filled the hidden field. Say it worked, store nothing, send nothing:
  // telling it otherwise only teaches it to leave the field alone.
  if (parsed.data.website) return { success: true };

  const limit = await consumeRateLimit(`enquiry:ip:${await callerAddress()}`, ENQUIRY_RULE);
  if (!limit.allowed) {
    return {
      success: false,
      error: `That is a lot of messages from one place. Please wait ${describeWait(limit.retryAfterSeconds)}, or call or WhatsApp us.`,
    };
  }

  try {
    const property = await prisma.property.findFirst({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!property) return { success: false, error: UNAVAILABLE };

    const { website: _honeypot, ...values } = parsed.data;
    void _honeypot;
    await EnquiryService.create(property.id, values);

    // After the response: the guest is not kept waiting on the mail provider,
    // and a failed send does not lose a message that is already stored.
    after(() =>
      notifyEnquiry({
        name: values.name,
        email: values.email,
        phone: values.phone ?? null,
        subject: values.subject,
        travelDates: values.travelDates ?? null,
        message: values.message,
      }),
    );
    revalidatePath("/admin/enquiries");
    return { success: true };
  } catch (error) {
    console.error("submitEnquiry failed:", error instanceof Error ? error.message : error);
    return { success: false, error: UNAVAILABLE };
  }
}

/* ------------------------------------------------------------------ admin */

export async function listEnquiries(): Promise<Result<EnquiryRow[]>> {
  const guard = await requireAdminPermission("enquiries:view");
  if (!guard.ok) return guard.failure;
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    return { success: true, data: await EnquiryService.list(propertyId) };
  } catch (error) {
    console.error("listEnquiries failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Messages could not be loaded. Please try again." };
  }
}

export async function setEnquiryStatus(id: string, status: string): Promise<Result> {
  const guard = await requireAdminPermission("enquiries:manage");
  if (!guard.ok) return guard.failure;
  const parsed = z.object({ id: z.string().cuid(), status: z.nativeEnum(EnquiryStatus) }).safeParse({ id, status });
  if (!parsed.success) return { success: false, error: "That message was not found." };
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const ok = await EnquiryService.setStatus(propertyId, parsed.data.id, parsed.data.status);
    if (!ok) return { success: false, error: "That message was not found." };
    revalidatePath("/admin/enquiries");
    return { success: true };
  } catch (error) {
    console.error("setEnquiryStatus failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not save. Please try again." };
  }
}

export async function deleteEnquiry(id: string): Promise<Result> {
  const guard = await requireAdminPermission("enquiries:delete");
  if (!guard.ok) return guard.failure;
  const parsed = z.string().cuid().safeParse(id);
  if (!parsed.success) return { success: false, error: "That message was not found." };
  try {
    const propertyId = await resolveDefaultPropertyId();
    if (!propertyId) return { success: false, error: NO_PROPERTY };
    const ok = await EnquiryService.remove(propertyId, parsed.data);
    if (!ok) return { success: false, error: "That message was not found." };
    revalidatePath("/admin/enquiries");
    return { success: true };
  } catch (error) {
    console.error("deleteEnquiry failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "That did not delete. Please try again." };
  }
}
