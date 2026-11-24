import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/seo/site";

/**
 * Frame for the sign-in, sign-up and reset pages: the house on one side, a
 * calm white card on the other. Stacks on phones with the photo as a band.
 */
export function AuthShell({
  title,
  intro,
  children,
  footer,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[#f6f1e8]">
      <div className="relative h-40 sm:h-64 lg:h-auto">
        <Image
          src="/hero/hero-pool-frangipani.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-[35%_55%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2219]/80 via-[#0f2219]/30 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-10 text-white">
          <p className="font-serif text-2xl lg:text-4xl">{SITE.name}</p>
          <p className="mt-1 text-sm text-white/80">A small guesthouse beside Udawalawe National Park</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <Image src="/brand/logo-128.png" alt="Lily Resort Udawalawe logo" width={128} height={128} className="h-14 w-14 rounded-full shadow-sm" />
        </Link>
        <div className="w-full max-w-md rounded-3xl bg-white p-7 sm:p-9 shadow-[0_20px_60px_-30px_rgba(28,25,23,0.35)] ring-1 ring-stone-900/5">
          <h1 className="font-serif text-3xl text-stone-900">{title}</h1>
          {intro && <div className="mt-2 text-sm leading-relaxed text-stone-600">{intro}</div>}
          <div className="mt-7">{children}</div>
        </div>
        {footer && <div className="mt-6 text-sm text-stone-600 text-center">{footer}</div>}
        <Link href="/" className="mt-8 text-xs text-stone-500 hover:text-emerald-700">&larr; Back to the website</Link>
      </div>
    </main>
  );
}

export const authInput =
  "w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:opacity-60";
export const authLabel = "mb-1.5 block text-sm font-medium text-stone-700";
export const authButton =
  "w-full rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const style =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-sm ${style}`}>
      {children}
    </div>
  );
}
