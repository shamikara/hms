"use server";

import { z } from "zod";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { createSession, verifySession } from "@/core/lib/session";
import { GUEST_ROLE } from "../types";
import {
  REGISTER_RULE,
  RESET_REQUEST_RULE,
  RESET_VERIFY_RULE,
  callerAddress,
  consumeRateLimit,
  describeWait,
} from "@/core/security/rateLimit";
import { AccountEmails } from "@/features/notifications/services/account-notifications";
import { AccountError, AccountService } from "../services/account.service";
import { EmailOnlySchema, RegisterSchema, ResetWithCodeSchema } from "../validations/account.schema";

type Result = { success: boolean; error?: string };

const GENERIC = "Something went wrong on our side. Please try again in a moment.";

function firstIssue(error: z.ZodError): string {
  return error.issues?.[0]?.message ?? "Please check the details and try again.";
}

async function throttle(key: string, rule: typeof REGISTER_RULE): Promise<Result | null> {
  const limit = await consumeRateLimit(key, rule);
  if (limit.allowed) return null;
  return { success: false, error: `Too many attempts. Please wait ${describeWait(limit.retryAfterSeconds)} and try again.` };
}

/**
 * Guest sign-up. Creates the account and signs the person straight in; no
 * email step. Bookings stay hidden until they confirm the address with a
 * code on the account page.
 */
export async function registerAction(input: unknown): Promise<Result & { redirectTo?: string }> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  if (parsed.data.website) return { success: true, redirectTo: "/" }; // honeypot: a bot

  const limited = await throttle(`register:ip:${await callerAddress()}`, REGISTER_RULE);
  if (limited) return limited;

  try {
    const { firstName, lastName, email, password } = parsed.data;
    const { userId } = await AccountService.register({ firstName, lastName, email, password });
    await createSession({ userId, role: GUEST_ROLE, roles: [] });
    return { success: true, redirectTo: "/account?welcome=1" };
  } catch (error) {
    if (error instanceof AccountError) return { success: false, error: error.message };
    console.error("registerAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: GENERIC };
  }
}

/** Account page: email a 6-digit code that confirms the address. */
export async function requestEmailCodeAction(): Promise<Result> {
  const session = await verifySession();
  if (!session) return { success: false, error: "Please sign in again." };
  const limited =
    (await throttle(`confirm-code:ip:${await callerAddress()}`, RESET_REQUEST_RULE)) ??
    (await throttle(`confirm-code:user:${session.userId}`, RESET_REQUEST_RULE));
  if (limited) return limited;
  try {
    const issued = await AccountService.requestEmailCode(session.userId);
    if (issued) after(() => AccountEmails.sendConfirmCode(issued.email, issued.firstName, issued.code));
    return { success: true };
  } catch (error) {
    console.error("requestEmailCodeAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: GENERIC };
  }
}

const ConfirmCodeSchema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.") });

/** Account page: check the code; on success the bookings appear. */
export async function confirmEmailCodeAction(input: unknown): Promise<Result> {
  const session = await verifySession();
  if (!session) return { success: false, error: "Please sign in again." };
  const parsed = ConfirmCodeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const limited = await throttle(`confirm-verify:user:${session.userId}`, RESET_VERIFY_RULE);
  if (limited) return limited;
  try {
    await AccountService.confirmEmailCode(session.userId, parsed.data.code);
    revalidatePath("/account");
    return { success: true };
  } catch (error) {
    if (error instanceof AccountError) return { success: false, error: error.message };
    console.error("confirmEmailCodeAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: GENERIC };
  }
}

/** "Send the confirmation link again." Same answer whether or not it sent. */
export async function resendVerificationAction(input: unknown): Promise<Result> {
  const parsed = EmailOnlySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const address = await callerAddress();
  const limited =
    (await throttle(`verify-resend:ip:${address}`, RESET_REQUEST_RULE)) ??
    (await throttle(`verify-resend:acct:${parsed.data.email}`, RESET_REQUEST_RULE));
  if (limited) return limited;
  try {
    const issued = await AccountService.resendVerification(parsed.data.email);
    if (issued) after(() => AccountEmails.sendVerify(parsed.data.email, issued.firstName, issued.token));
    return { success: true };
  } catch (error) {
    console.error("resendVerificationAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: GENERIC };
  }
}

/** Step 1 of a reset: email a 6-digit code. Same answer for unknown emails. */
export async function requestPasswordResetAction(input: unknown): Promise<Result> {
  const parsed = EmailOnlySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const address = await callerAddress();
  const limited =
    (await throttle(`reset-request:ip:${address}`, RESET_REQUEST_RULE)) ??
    (await throttle(`reset-request:acct:${parsed.data.email}`, RESET_REQUEST_RULE));
  if (limited) return limited;
  try {
    const issued = await AccountService.requestPasswordReset(parsed.data.email);
    if (issued) after(() => AccountEmails.sendResetCode(parsed.data.email, issued.firstName, issued.code));
    return { success: true };
  } catch (error) {
    console.error("requestPasswordResetAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: GENERIC };
  }
}

/** Step 2: the code and the new password. */
export async function resetPasswordAction(input: unknown): Promise<Result> {
  const parsed = ResetWithCodeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  const limited = await throttle(`reset-verify:ip:${await callerAddress()}`, RESET_VERIFY_RULE);
  if (limited) return limited;
  try {
    await AccountService.resetPassword(parsed.data.email, parsed.data.code, parsed.data.password);
    return { success: true };
  } catch (error) {
    if (error instanceof AccountError) return { success: false, error: error.message };
    console.error("resetPasswordAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: GENERIC };
  }
}
