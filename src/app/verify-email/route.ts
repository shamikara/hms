import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/core/lib/session";
import { AuthRepository } from "@/features/auth/repositories/auth.repository";
import { GUEST_ROLE } from "@/features/auth/types";
import { AccountError, AccountService } from "@/features/auth/services/account.service";

export const dynamic = "force-dynamic";

/**
 * The link in the confirmation email. Confirms the address, signs the guest
 * in, and lands them on their account page. A route handler rather than a
 * page because it sets the session cookie.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  try {
    const userId = await AccountService.verifyEmail(token);
    const profile = await AuthRepository.findRolesForUser(userId);
    const roles = profile?.roles ?? [];
    await createSession({ userId, role: roles[0] ?? GUEST_ROLE, roles });
    return NextResponse.redirect(new URL("/account?welcome=1", request.url));
  } catch (error) {
    if (!(error instanceof AccountError)) {
      console.error("verify-email failed:", error instanceof Error ? error.message : error);
    }
    return NextResponse.redirect(new URL("/login?confirm=expired", request.url));
  }
}
