import { redirect } from "next/navigation";
import { verifySession } from "@/core/lib/session";
import { AdminShell } from "./AdminShell";

/**
 * Every admin page re-checks the session on the server. The proxy only checks
 * the cookie's signature; this also checks that the account is still active
 * and that the password has not been changed since the cookie was issued, so
 * a signed-out device lands back on the sign-in page instead of a blank shell.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect("/login?next=/admin/dashboard");
  return <AdminShell>{children}</AdminShell>;
}
