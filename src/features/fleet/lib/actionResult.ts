import { z } from "zod";
import { AppError } from "@/core/types/Result";
import { Logger } from "@/core/logging/Logger";
import { AuthzError } from "./authz";

/**
 * Shared shape for every fleet server action, matching the convention already
 * used by the auth / booking / safari actions in this codebase.
 *
 * Lives outside the `"use server"` files on purpose: a `"use server"` module may
 * only export async functions, so helpers and types have to be imported in.
 */
export interface FleetActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** Machine-readable code, useful for form-level handling (e.g. conflicts). */
  code?: string;
  /** Individual conflict messages, when an assignment was refused. */
  conflicts?: string[];
}

const logger = new Logger("FleetActions");

export function actionOk<T>(data: T): FleetActionResult<T> {
  return { success: true, data };
}

/**
 * Normalises anything a service can throw into the action result shape.
 * Unexpected errors are logged and reported generically — internal messages and
 * stack traces are never handed to the client.
 */
export function actionError<T>(error: unknown, context: string): FleetActionResult<T> {
  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: error.issues[0]?.message ?? "The submitted values are not valid.",
      code: "VALIDATION_ERROR",
    };
  }

  if (error instanceof AuthzError) {
    return { success: false, error: error.message, code: error.code };
  }

  if (error instanceof AppError) {
    const conflicts = error.details?.conflicts;
    return {
      success: false,
      error: error.message,
      code: error.code,
      ...(Array.isArray(conflicts) ? { conflicts: conflicts as string[] } : {}),
    };
  }

  logger.error(`Unhandled error in ${context}`, error);
  return {
    success: false,
    error: "Something went wrong. Please try again.",
    code: "INTERNAL_ERROR",
  };
}

/** Failure result for a read path whose database is unreachable. */
export function actionUnavailable<T>(
  message = "The fleet database is unreachable right now."
): FleetActionResult<T> {
  return { success: false, error: message, code: "DB_UNAVAILABLE" };
}

/** Failure result for a missing entity. */
export function actionNotFound<T>(message: string): FleetActionResult<T> {
  return { success: false, error: message, code: "NOT_FOUND" };
}

/**
 * Database-unreachable degradation used by read paths only.
 *
 * This project already ships hosted demo builds without a live Postgres (see
 * the existing admin actions), so reads must not crash the page. We return an
 * explicit failure with a reason rather than substituting invented data — a
 * fabricated fleet is worse than an empty one.
 */
export function isConnectivityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("Can't reach database server") ||
    message.includes("Connection terminated") ||
    message.includes("getaddrinfo")
  );
}
