import Link from "next/link";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-950 font-sans text-stone-100 flex flex-col selection:bg-emerald-200 selection:text-emerald-900">
      <PublicHeader variant="solid" />

      <main className="flex-1 flex flex-col justify-center items-center p-4 py-16">
        <div className="w-full max-w-md bg-stone-900 rounded-2xl shadow-2xl overflow-hidden border border-stone-800">
          <div className="h-2 w-full bg-emerald-700" />
          <div className="p-8 sm:p-12">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-serif text-white mb-2 tracking-tight">Lily Resort Portal</h1>
              <p className="text-stone-400 text-sm">Sign in to Lily Resort Udawalawe Enterprise Platform</p>
            </div>

            <LoginForm />
          </div>

          <div className="p-4 bg-stone-950 border-t border-stone-800/80 text-center text-xs font-mono space-y-1">
            <p className="text-stone-300 font-semibold flex items-center justify-center space-x-1.5">
              <span>A Product by Spandha Labs</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </p>
            <p className="text-stone-500 italic text-[11px]">"Building software people remember."</p>
            <p className="text-stone-400 text-[10px]">
              Built with <strong className="text-stone-300">Platform OS</strong> •{" "}
              <a
                href="https://spandhalabs.lk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline"
              >
                spandhalabs.lk
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-stone-500 font-mono">
          <p>&copy; {new Date().getFullYear()} Spandha Labs & Lily Resort Udawalawe. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
