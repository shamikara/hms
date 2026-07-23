"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight, Phone, Mail, User, Shield } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/utils";

interface PublicHeaderProps {
  variant?: "transparent" | "solid";
}

export function PublicHeader({ variant = "transparent" }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isSolid = variant === "solid";

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
    { href: "/about", label: "The Lodge" },
    { href: "/rooms", label: "Accommodation" },
    { href: "/safari", label: "Experiences" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header
        className={cn(
          "w-full z-40 py-3.5 px-4 sm:px-8 lg:px-16 flex justify-between items-center transition-all select-none",
          isSolid
            ? "sticky top-0 bg-stone-950/95 backdrop-blur-md border-b border-stone-850 text-stone-100 shadow-xl"
            : "absolute top-0 text-stone-100"
        )}
      >
        {/* Brand Logo & Name */}
        <ScrollReveal direction="down" delay={0.1} width="w-auto">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-serif font-bold text-sm shrink-0">
              L
            </div>
            <span className="font-serif tracking-widest uppercase text-white drop-shadow-md text-base sm:text-xl lg:text-2xl font-medium">
              <span className="inline sm:hidden">Lily Resort</span>
              <span className="hidden sm:inline">Lily Resort Udawalawe</span>
            </span>
          </Link>
        </ScrollReveal>

        {/* Desktop Navigation Links */}
        <ScrollReveal direction="down" delay={0.2} width="w-auto" className="hidden md:block">
          <nav className="flex space-x-8 text-sm font-medium tracking-wide drop-shadow-md">
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
          <ScrollReveal direction="down" delay={0.3} width="w-auto">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center space-x-1.5 px-4 sm:px-5 py-2 border border-white/30 hover:bg-white hover:text-stone-900 rounded-full text-xs sm:text-sm font-medium transition-all backdrop-blur-sm shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span>Guest Portal</span>
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
              <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-400 font-serif font-bold text-sm">
                L
              </div>
              <span className="font-serif tracking-widest uppercase text-white text-base font-semibold">
                Lily Resort
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
                <span>Home</span>
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
                <span>Book Direct & Save</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3.5 text-center bg-stone-900 border border-stone-800 hover:bg-stone-850 rounded-xl font-sans text-sm font-medium text-stone-200 transition-colors flex items-center justify-center space-x-2"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>Guest Portal Sign In</span>
              </Link>

              {/* Mobile Footer Meta */}
              <div className="pt-4 space-y-2 text-xs text-stone-400 font-mono">
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>+94 47 223 4567</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>reservations@lilyresortudawalawe.com</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] text-stone-500 pt-2">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  <span>Udawalawe National Park Conservation Reserve</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
