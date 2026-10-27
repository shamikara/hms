import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { PublicHeader } from "@/components/navigation/PublicHeader";

/**
 * robots.txt already asks crawlers not to fetch this page, but a crawler that
 * reaches it from a link anyway never reads robots.txt again to find out. The
 * header says the same thing to whoever is actually looking at the response.
 */
export const metadata: Metadata = {
  title: "Staff sign-in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      <PublicHeader variant="solid" />

      <main className="flex-1 flex flex-col justify-center items-center p-4 py-16">
        <div className="w-full max-w-md bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-800">
          <div className="h-2 w-full bg-emerald-700" />
          <div className="p-8 sm:p-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif text-white mb-2 tracking-tight">Wildlily Safari Resort Portal</h1>
              <p className="text-stone-400 text-sm">Sign in to Wildlily Safari Resort Enterprise Platform</p>
            </div>

            <LoginForm />
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-stone-400 font-mono space-y-1">
          <p>&copy; {new Date().getFullYear()} Wildlily Safari Resort</p>
          <p>
            Built with <span className="text-stone-300 font-semibold">Platform OS</span> by{" "}
            <a
              href="https://spandhalabs.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-300 hover:text-emerald-400 font-semibold transition-colors underline underline-offset-2"
            >
              Spandha Labs
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
