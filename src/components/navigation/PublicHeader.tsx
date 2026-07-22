"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { cn } from "@/lib/utils";

interface PublicHeaderProps {
  variant?: "transparent" | "solid";
}

export function PublicHeader({ variant = "transparent" }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isSolid = variant === "solid";

  const navLinks = [
    { href: "/about", label: "The Lodge" },
    { href: "/rooms", label: "Accommodation" },
    { href: "/safari", label: "Experiences" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header
      className={cn(
        "w-full z-50 py-4 px-4 sm:px-8 lg:px-16 flex justify-between items-center transition-all select-none",
        isSolid
          ? "sticky top-0 bg-stone-950/95 backdrop-blur-md border-b border-stone-800/80 text-stone-100 shadow-xl"
          : "absolute top-0 text-stone-100"
      )}
    >
      <ScrollReveal direction="down" delay={0.1} width="w-auto">
        <Link href="/" className="text-xl sm:text-2xl font-serif tracking-widest uppercase text-white drop-shadow-md">
          Lily Resort Udawalawe
        </Link>
      </ScrollReveal>

      {/* Desktop Navigation */}
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

      {/* Right Action & Mobile Menu Button */}
      <div className="flex items-center space-x-3">
        <ScrollReveal direction="down" delay={0.3} width="w-auto">
          <Link
            href="/login"
            className="px-4 sm:px-6 py-1.5 sm:py-2 border border-white/40 hover:bg-white hover:text-stone-900 rounded-full text-xs sm:text-sm font-medium transition-all backdrop-blur-sm"
          >
            Guest Portal
          </Link>
        </ScrollReveal>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
          className="flex md:hidden p-2 rounded-lg bg-black/40 border border-stone-700 text-stone-200 hover:bg-black/60 transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-stone-950/98 backdrop-blur-2xl md:hidden flex flex-col p-6 space-y-6 text-stone-100 border-b border-stone-800 animate-in fade-in duration-200">
          <nav className="flex flex-col space-y-4 text-lg font-serif">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "py-3 border-b border-stone-800/80 transition-colors flex items-center justify-between",
                    isActive ? "text-emerald-400 font-semibold" : "text-stone-200 hover:text-emerald-400"
                  )}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                </Link>
              );
            })}
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-6 w-full py-3.5 text-center bg-emerald-700 hover:bg-emerald-600 rounded-full font-sans text-sm font-medium tracking-wider uppercase text-white transition-colors shadow-lg"
            >
              Book Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
