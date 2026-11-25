import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import type { ContactValues } from "@/features/site/validations/site.schema";
import { HOME, type HomeDict } from "@/lib/i18n/home";

/** Last word on the page: book, or ring. */
export function ClosingCta({ contact, t = HOME.en.cta }: { contact: ContactValues; t?: HomeDict["cta"] }) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 px-5 sm:px-8 lg:px-16">
      <Image src="/property-verandah-dusk.webp" alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0f2219]/90 via-[#0f2219]/75 to-[#0f2219]/40" />
      <div className="relative max-w-7xl mx-auto">
        <div className="max-w-xl">
          <h2 className="font-serif text-4xl sm:text-5xl leading-tight text-white">{t.title}</h2>
          <p className="mt-5 text-lg text-stone-200">
            {t.text}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-7 py-3.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-400 transition-colors"
            >
              {t.button} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <Phone className="h-4 w-4" aria-hidden /> {contact.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
