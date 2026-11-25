"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, Phone, Mail, User, Shield } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/utils";
import { useHeaderScroll } from "./useHeaderScroll";
import { HOME, LOCALES, LOCALE_NAME, LOCALE_PATH, LOCALE_SHORT, type HomeDict, type Locale } from "@/lib/i18n/home";

interface PublicHeaderClientProps {
  variant?: "transparent" | "solid";
  /** Shown in the mobile drawer; read from Site Settings by the server wrapper. */
  phoneDisplay: string;
  email: string;
  t?: HomeDict["nav"];
  /** Set on the homepages only: shows the language picker. */
  locale?: Locale;
}

/** EN · DE · FR, as plain links so each language has its own indexable page. */
function LanguagePicker({ locale, label, className }: { locale: Locale; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("flex items-center rounded-full border border-white/25 p-0.5 backdrop-blur-sm", className)}>
      {LOCALES.map((l) => (
        <Link
          key={l}
          href={LOCALE_PATH[l]}
          hrefLang={l}
          lang={l}
          title={LOCALE_NAME[l]}
          aria-current={l === locale ? "true" : undefined}
          className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wider transition-colors",
            l === locale ? "bg-white text-stone-900" : "text-stone-200 hover:text-white",
          )}
        >
          {LOCALE_SHORT[l]}
        </Link>
      ))}
    </nav>
  );
}

export function PublicHeaderClient({ variant = "transparent", phoneDisplay, email, t = HOME.en.nav, locale }: PublicHeaderClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isSolid = variant === "solid";
  const { hidden, scrolled, pastHero } = useHeaderScroll();

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { href: "/about", label: t.about },
    { href: "/rooms", label: t.rooms },
    { href: "/safari", label: t.safari },
    { href: "/dining", label: t.food },
    { href: "/guide", label: t.guide },
    { href: "/contact", label: t.contact },
  ];

  return (
    <>
      <header
        className="site-header w-full px-4 sm:px-8 lg:px-16 flex justify-between items-center select-none text-stone-100"
        data-has-hero={!isSolid ? "true" : "false"}
        data-over-hero={!isSolid && !pastHero ? "true" : "false"}
        data-hidden={hidden ? "true" : "false"}
        data-scrolled={scrolled ? "true" : "false"}
      >
        {/* Brand Logo & Name */}
        <ScrollReveal direction="down" delay={0.1} width="w-auto">
          <Link href="/" className="site-header__brand flex items-center gap-3 group">
            <Image
              src="/brand/logo-128.png"
              alt="Lily Resort Udawalawe logo"
              width={128}
              height={128}
              priority
              className="h-10 w-10 lg:h-12 lg:w-12 shrink-0 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
            />
            <span className="font-serif tracking-widest uppercase text-white drop-shadow-md text-base sm:text-xl lg:text-2xl font-medium">
              <span className="inline sm:hidden">Lily Safari</span>
              <span className="hidden sm:inline">Lily Safari Resort</span>
            </span>
          </Link>
        </ScrollReveal>

        {/* Desktop Navigation Links */}
        <ScrollReveal direction="down" delay={0.2} width="w-auto" className="hidden md:block">
          <nav className="flex space-x-5 lg:space-x-8 text-sm font-medium tracking-wide drop-shadow-md">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "transition-colors relative py-1",
                    isActive ? "text-emerald-400 font-semibold" : "text-stone-300 hover:text-emerald-300"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full animate-in fade-in" />
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollReveal>

        {/* Right Actions (Desktop Portal + Mobile Hamburger) */}
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          {locale && (
            <ScrollReveal direction="down" delay={0.25} width="w-auto">
              <LanguagePicker locale={locale} label={t.language} />
            </ScrollReveal>
          )}
          <ScrollReveal direction="down" delay={0.3} width="w-auto">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center space-x-1.5 px-4 sm:px-5 py-2 border border-white/30 hover:bg-white hover:text-stone-900 rounded-full text-xs sm:text-sm font-medium transition-all backdrop-blur-sm shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.account}</span>
            </Link>
          </ScrollReveal>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-xl bg-stone-900/90 border border-stone-700/80 text-stone-200 hover:bg-stone-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Full-Screen Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950 flex flex-col md:hidden animate-in fade-in duration-200">
          {/* Mobile Drawer Top Header */}
          <div className="flex items-center justify-between p-4 border-b border-stone-850 bg-stone-950">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2"
            >
              <Image src="/brand/logo-128.png" alt="" width={128} height={128} className="h-9 w-9 rounded-full" />
              <span className="font-serif tracking-widest uppercase text-white text-base font-semibold">
                Lily Safari Resort
              </span>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mobile Drawer Body */}
          <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col justify-between space-y-8">
            <nav className="flex flex-col space-y-3 font-serif">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "py-3.5 border-b border-stone-850 text-lg flex items-center justify-between transition-colors",
                  pathname === "/" ? "text-emerald-400 font-semibold" : "text-stone-200"
                )}
              >
                <span>{t.home}</span>
                <ChevronRight className="w-4 h-4 text-stone-500" />
              </Link>

              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "py-3.5 border-b border-stone-850 text-lg flex items-center justify-between transition-colors",
                      isActive ? "text-emerald-400 font-semibold" : "text-stone-200"
                    )}
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="w-4 h-4 text-stone-500" />
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Actions */}
            <div className="space-y-4 pt-4 border-t border-stone-850">
              <Link
                href="/book"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-4 text-center bg-emerald-700 hover:bg-emerald-600 rounded-xl font-sans text-sm font-semibold tracking-wider uppercase text-white transition-colors shadow-lg flex items-center justify-center space-x-2"
              >
                <span>{t.bookDirect}</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 text-center bg-stone-900 border border-stone-800 hover:bg-stone-850 rounded-xl font-sans text-sm font-medium text-stone-200 transition-colors flex items-center justify-center space-x-2"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>{t.signIn}</span>
              </Link>

              {/* Mobile Footer Meta */}
              <div className="pt-4 space-y-2 text-xs text-stone-400 font-mono">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{phoneDisplay}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{email}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-stone-500 pt-2">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>{t.nearPark}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
