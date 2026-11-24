import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

/** Long enough that length does the work; no composition rules to game. */
export const guestPassword = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(128, "That password is too long");

export const RegisterSchema = z
  .object({
    firstName: z.string().trim().min(1, "Please enter your first name").max(100),
    lastName: z.string().trim().min(1, "Please enter your last name").max(100),
    email,
    password: guestPassword,
    confirmPassword: z.string(),
    /** Honeypot: bots fill it in; people never see it. */
    website: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

export const EmailOnlySchema = z.object({ email });

export const ResetWithCodeSchema = z
  .object({
    email,
    code: z.string().trim().regex(/^\d{6}$/, "The code is 6 digits"),
    password: guestPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterValues = z.infer<typeof RegisterSchema>;
export type ResetWithCodeValues = z.infer<typeof ResetWithCodeSchema>;
