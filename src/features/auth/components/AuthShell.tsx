import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { SITE } from "@/lib/seo/site";
import { getSiteContent } from "@/features/site/services/site.service";
import { AuthPhoto } from "./AuthPhoto";

/**
 * Frame for the sign-in, sign-up and reset pages: the house on one side, a
 * calm white card on the other. Stacks on phones with the photo as a band.
 */
export async function AuthShell({
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
  // Real scores from Admin → Site Settings; the card hides itself if none are set.
  const { ratings, aggregate } = await getSiteContent();

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[#f6f1e8]">
      <div className="relative h-52 sm:h-64 lg:h-auto">
        <AuthPhoto />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2219]/80 via-[#0f2219]/30 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 lg:bottom-10 lg:left-10 text-white">
          <p className="font-serif text-2xl lg:text-4xl">{SITE.name}</p>
          <p className="mt-1 hidden text-sm text-white/80 sm:block">A small guesthouse beside Udawalawe National Park</p>
          {aggregate && (
            <>
              {/* Phones: one compact line under the name. */}
              <p className="mt-2 flex items-center gap-1.5 text-xs text-white/90 lg:hidden">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" aria-hidden />
                {aggregate.value.toFixed(1)} / 5 · {aggregate.count.toLocaleString("en-GB")} guest reviews
              </p>
              {/* Larger screens: a glass card with each platform's own score. */}
              <div className="mt-6 hidden max-w-md rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-md lg:block">
                <div className="flex items-center gap-3">
                  <span className="font-serif text-4xl leading-none">{aggregate.value.toFixed(1)}</span>
                  <div>
                    <div className="flex gap-0.5" aria-label={`${aggregate.value.toFixed(1)} out of 5`}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          aria-hidden
                          className={`h-4 w-4 ${i <= Math.round(aggregate.value) ? "fill-amber-300 text-amber-300" : "fill-white/20 text-white/20"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-white/75">from {aggregate.count.toLocaleString("en-GB")} guest reviews</p>
                  </div>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/85">
                  {ratings.slice(0, 4).map((r) => (
                    <li key={r.platform} className="flex justify-between gap-2">
                      <span className="truncate">{r.platform}</span>
                      <span className="font-mono text-white">
                        {r.score}
                        <span className="text-white/50">/{r.outOf}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
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

export { Notice, authButton, authInput, authLabel } from "./auth-ui";
