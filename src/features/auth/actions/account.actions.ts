"use server";

import { z } from "zod";
import { after } from "next/server";
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
 * Guest sign-up. Always ends on the same "check your email" screen, whether
 * the address was new, waiting for confirmation, or already an account, so
 * the form cannot be used to find out who has an account here.
 */
export async function registerAction(input: unknown): Promise<Result> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstIssue(parsed.error) };
  if (parsed.data.website) return { success: true }; // honeypot: a bot

  const limited = await throttle(`register:ip:${await callerAddress()}`, REGISTER_RULE);
  if (limited) return limited;

  try {
    const { firstName, lastName, email, password } = parsed.data;
    const outcome = await AccountService.register({ firstName, lastName, email, password });
    after(() =>
      outcome.kind === "exists"
        ? AccountEmails.sendAlreadyRegistered(email, outcome.firstName)
        : AccountEmails.sendVerify(email, outcome.firstName, outcome.verifyToken),
    );
    return { success: true };
  } catch (error) {
    console.error("registerAction failed:", error instanceof Error ? error.message : error);
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
