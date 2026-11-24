import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/core/lib/session";
import { AuthShell, Notice } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  "reset:done": { tone: "success", text: "Your password has been changed. Sign in with the new one." },
  "confirm:expired": { tone: "error", text: "That confirmation link has expired or was already used. Sign in and we'll offer to send a new one." },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; confirm?: string }>;
}) {
  const params = await searchParams;

  // Already signed in: go where a fresh sign-in would have gone.
  const session = await verifySession();
  if (session) redirect(session.roles.length > 0 ? "/admin/dashboard" : "/account");

  const notice = params.reset ? NOTICES[`reset:${params.reset}`] : params.confirm ? NOTICES[`confirm:${params.confirm}`] : undefined;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <AuthShell
      title="Welcome back"
      intro="Sign in to see your bookings and rate your safari driver."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-semibold text-emerald-700 hover:text-emerald-600">Create an account</Link>
        </>
      }
    >
      {notice && <div className="mb-5"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      <LoginForm next={next} />
    </AuthShell>
  );
}
