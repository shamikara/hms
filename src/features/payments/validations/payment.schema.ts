import { z } from "zod";

/** Admin > Site Settings > Online payments. */
export const PaymentSettingsSchema = z.object({
  enabled: z.boolean(),
  advancePercent: z.coerce
    .number()
    .int("Use a whole percentage.")
    .min(10, "The advance should be at least 10%.")
    .max(100, "The advance cannot be more than 100%."),
  freeCancelDays: z.coerce
    .number()
    .int("Use a whole number of days.")
    .min(0, "Days cannot be negative.")
    .max(90, "Keep it to 90 days or fewer."),
});
export type PaymentSettings = z.infer<typeof PaymentSettingsSchema>;

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: false,
  advancePercent: 30,
  freeCancelDays: 7,
};

export const PAY_CHOICES = ["ADVANCE", "FULL"] as const;
export type PayChoice = (typeof PAY_CHOICES)[number];

export const RefundSchema = z.object({
  onlinePaymentId: z.string().min(1).max(64),
  /** Rupees, as staff type them. */
  amount: z.coerce.number().positive("Enter an amount to refund.").max(100_000_000),
  reason: z
    .string()
    .trim()
    .max(200, "Keep the reason under 200 characters.")
    .optional()
    .transform((v) => (v ? v : undefined)),
});
