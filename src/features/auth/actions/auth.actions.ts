"use server";

import { z } from "zod";
import { AuthService } from "../services/auth.service";
import { LoginSchema, LoginFormValues } from "../validations/auth.schema";
import { createSession, deleteSession } from "@/core/lib/session";
import { redirect } from "next/navigation";

export async function loginAction(data: LoginFormValues) {
  try {
    const parsedData = LoginSchema.parse(data);
    const user = await AuthService.login(parsedData);
    
    await createSession({ userId: user.id, role: user.role });
    
    return { success: true, user };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.issues?.[0]?.message || error.message };
    }
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
