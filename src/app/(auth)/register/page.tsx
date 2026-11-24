import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifySession } from "@/core/lib/session";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: "Create an account", robots: { index: false, follow: false } };

export default async function RegisterPage() {
  if (await verifySession()) redirect("/account");
  return (
    <AuthShell
      title="Create your account"
      intro="See your bookings in one place and rate your safari driver after your drive."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-600">Sign in</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
