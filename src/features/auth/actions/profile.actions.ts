"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/core/db/prisma";
import { verifySession } from "@/core/lib/session";
import { RESET_VERIFY_RULE, consumeRateLimit, describeWait } from "@/core/security/rateLimit";
import { getAdminActor } from "@/features/admin/lib/requireAdminSession";
import { STAFF_ROLES } from "@/features/staff/validations/staff.schema";
import { guestPassword } from "../validations/account.schema";

type Result<T = undefined> = { success: boolean; data?: T; error?: string };

export interface MyProfile {
  name: string;
  email: string;
  role: string;
}

/** Who is signed in, for the admin header. Their own details only. */
export async function loadMyProfileAction(): Promise<Result<MyProfile>> {
  const actor = await getAdminActor();
  if (!actor) return { success: false, error: "Please sign in again." };
  try {
    const user = await prisma.user.findUnique({
      where: { id: actor.userId },
      select: {
        email: true,
        employee: { select: { firstName: true, lastName: true } },
        guestProfile: { select: { firstName: true, lastName: true } },
      },
    });
    if (!user) return { success: false, error: "Please sign in again." };
    const person = user.employee ?? user.guestProfile;
    const name = person ? `${person.firstName} ${person.lastName}`.trim() : "";
    // Show the most senior role, in the order the staff screen lists them.
    const top = STAFF_ROLES.find((r) => actor.roles.includes(r.name));
    return {
      success: true,
      data: { name: name || user.email.split("@")[0], email: user.email, role: top?.label ?? "Staff" },
    };
  } catch (error) {
    console.error("loadMyProfileAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Could not load your details." };
  }
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(128),
    newPassword: guestPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "The two new passwords do not match", path: ["confirmPassword"] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Choose a password different from the current one", path: ["newPassword"] });

/**
 * Change your own password. Needs the current one, so a sign-in left open on
 * a shared computer cannot be used to lock the owner out.
 */
export async function changeMyPasswordAction(input: unknown): Promise<Result> {
  const session = await verifySession();
  if (!session) return { success: false, error: "Please sign in again." };

  const parsed = ChangePasswordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Please check the passwords." };

  const limit = await consumeRateLimit(`change-password:user:${session.userId}`, RESET_VERIFY_RULE);
  if (!limit.allowed) {
    return { success: false, error: `Too many attempts. Please wait ${describeWait(limit.retryAfterSeconds)} and try again.` };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { passwordHash: true, isActive: true },
    });
    if (!user || !user.isActive || !user.passwordHash) return { success: false, error: "Please sign in again." };

    const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!ok) return { success: false, error: "Your current password is not right." };

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({ where: { id: session.userId }, data: { passwordHash } });
    return { success: true };
  } catch (error) {
    console.error("changeMyPasswordAction failed:", error instanceof Error ? error.message : error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
