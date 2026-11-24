import type { ReactNode } from "react";
import { PublicHeader } from "@/components/navigation/PublicHeader";
import { PublicFooter } from "@/components/navigation/PublicFooter";

export function PaymentPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <PublicHeader variant="solid" />
      <main className="flex-1 flex items-start justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-xl rounded-2xl border border-stone-800 bg-stone-900/80 p-6 sm:p-10 shadow-2xl">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}
