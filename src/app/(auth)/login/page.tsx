import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { PublicHeader } from "@/components/navigation/PublicHeader";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      <PublicHeader variant="solid" />

      <main className="flex-1 flex flex-col justify-center items-center p-4 py-16">
        <div className="w-full max-w-md bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-800">
          <div className="h-2 w-full bg-emerald-700" />
          <div className="p-8 sm:p-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif text-white mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-stone-400 text-sm">Sign in to the Safari Enterprise Platform</p>
            </div>

            <LoginForm />
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-stone-500 font-mono">
          <p>&copy; {new Date().getFullYear()} Safari Resort Platform. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
