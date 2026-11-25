import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getSiteContent } from "@/features/site/services/site.service";
import { HOME, type Locale } from "@/lib/i18n/home";

export async function PublicFooter({ locale = "en" }: { locale?: Locale } = {}) {
  const { contact } = await getSiteContent();
  const t = HOME[locale].footer;

  return (
    <footer className="bg-stone-950 text-stone-400 border-t border-stone-850 pt-16 pb-12 font-sans select-none">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand Column */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3 text-white">
            <Image src="/brand/logo-128.png" alt="Lily Resort Udawalawe logo" width={128} height={128} className="h-14 w-14 rounded-full" />
            <span className="text-lg font-serif tracking-widest uppercase leading-tight">Lily Safari Resort</span>
          </Link>
          <p className="text-xs leading-relaxed text-stone-400">
            {t.blurb}
          </p>
          {t.englishOnly && <p className="text-[11px] text-stone-500">{t.englishOnly}</p>}
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">{t.explore}</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/about" className="hover:text-emerald-400 transition-colors">{t.about}</Link>
            </li>
            <li>
              <Link href="/rooms" className="hover:text-emerald-400 transition-colors">{t.rooms}</Link>
            </li>
            <li>
              <Link href="/safari" className="hover:text-emerald-400 transition-colors">{t.safari}</Link>
            </li>
            <li>
              <Link href="/safari/drivers" className="hover:text-emerald-400 transition-colors">{t.drivers}</Link>
            </li>
            <li>
              <Link href="/dining" className="hover:text-emerald-400 transition-colors">{t.food}</Link>
            </li>
            <li>
              <Link href="/guide" className="hover:text-emerald-400 transition-colors">{t.guide}</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-emerald-400 transition-colors">{t.contact}</Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">{t.contactDesk}</h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {contact.street}, {contact.locality} {contact.postalCode}, Sri Lanka
              </span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={`tel:${contact.phone}`} className="hover:text-emerald-400 transition-colors">
                {contact.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <a href={`mailto:${contact.email}`} className="hover:text-emerald-400 transition-colors">
                {contact.email}
              </a>
            </li>
          </ul>
        </div>

        {/* Guest Experience */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">{t.account}</h4>
          <p className="text-xs text-stone-400">
            {t.accountText}
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900 transition-colors text-xs font-medium"
          >
            {t.signIn} &rarr;
          </Link>
          <Link href="/register" className="block text-center text-xs text-stone-400 hover:text-emerald-400 transition-colors">
            {t.register}
          </Link>
        </div>
      </div>

      {/* Clean & Minimal Bottom Attribution */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 pt-8 border-t border-stone-850 flex flex-col sm:flex-row justify-between items-center text-[11px] text-stone-400 space-y-3 sm:space-y-0 font-mono">
        <p>&copy; {new Date().getFullYear()} Lily Safari Resort. {t.rights}</p>
        <p className="text-stone-400">
          {t.builtWith} <span className="text-stone-300 font-semibold">Platform OS</span> {t.by}{" "}
          <a
            href="https://pulsecraftlabs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-300 hover:text-emerald-400 font-semibold transition-colors underline underline-offset-4"
          >
            PulseCraft Labs
          </a>
        </p>
      </div>

      {/* Mounted here because the footer renders on exactly the guest-facing
          pages — not login, not admin. The widget is fixed-position, so it
          escapes the footer's layout box. */}
      <ChatWidget />
    </footer>
  );
}
