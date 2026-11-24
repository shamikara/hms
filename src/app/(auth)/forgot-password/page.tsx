import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      intro="We'll email you a 6-digit code to choose a new password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-600">Sign in</Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
