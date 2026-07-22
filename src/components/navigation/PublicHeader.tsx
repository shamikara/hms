"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="absolute top-0 w-full z-50 py-4 px-4 sm:px-8 lg:px-16 flex justify-between items-center text-stone-100">
      <ScrollReveal direction="down" delay={0.1} width="w-auto">
        <Link href="/" className="text-xl sm:text-2xl font-serif tracking-widest uppercase text-white drop-shadow-md">
          Udawalawe Resort
        </Link>
      </ScrollReveal>

      {/* Desktop Navigation */}
      <ScrollReveal direction="down" delay={0.2} width="w-auto" className="hidden md:block">
        <nav className="flex space-x-8 text-sm font-medium tracking-wide drop-shadow-md">
          <Link href="/about" className="hover:text-emerald-300 transition-colors">The Lodge</Link>
          <Link href="/rooms" className="hover:text-emerald-300 transition-colors">Accommodation</Link>
          <Link href="/safari" className="hover:text-emerald-300 transition-colors">Experiences</Link>
          <Link href="/contact" className="hover:text-emerald-300 transition-colors">Contact</Link>
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
          className="flex md:hidden p-2 rounded-lg bg-black/30 border border-white/20 text-white hover:bg-black/50 transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-stone-950/95 backdrop-blur-xl md:hidden flex flex-col p-6 space-y-6 text-stone-100 border-b border-stone-800 animate-in fade-in duration-200">
          <nav className="flex flex-col space-y-4 text-lg font-serif">
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-stone-800/80 hover:text-emerald-400 transition-colors"
            >
              The Lodge
            </Link>
            <Link
              href="/rooms"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-stone-800/80 hover:text-emerald-400 transition-colors"
            >
              Accommodation
            </Link>
            <Link
              href="/safari"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-stone-800/80 hover:text-emerald-400 transition-colors"
            >
              Experiences
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="py-2 border-b border-stone-800/80 hover:text-emerald-400 transition-colors"
            >
              Contact
            </Link>
            <Link
              href="/book"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-4 w-full py-3 text-center bg-emerald-700 hover:bg-emerald-600 rounded-full font-sans text-sm font-medium tracking-wide text-white transition-colors"
            >
              Book Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
