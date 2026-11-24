import { z } from "zod";

/** Topics on the contact form; anything else is refused rather than stored. */
export const ENQUIRY_SUBJECTS = [
  "Room enquiry",
  "Safari drive",
  "Food or dietary requirements",
  "Something else",
] as const;

export const EnquirySchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter an email address we can reply to").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a phone number we can reach you on, or leave it blank")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  subject: z.enum(ENQUIRY_SUBJECTS),
  travelDates: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().min(5, "Please write a short message").max(4000, "That message is too long"),
  /**
   * Honeypot: hidden from people, filled in by bots that complete every
   * field. Anything here means the submission is quietly discarded.
   */
  website: z.string().optional(),
});

export type EnquiryValues = z.infer<typeof EnquirySchema>;
