import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function PublicFooter() {
  return (
    <footer className="bg-stone-950 text-stone-400 border-t border-stone-850 pt-16 pb-12 font-sans select-none">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand Column */}
        <div className="space-y-4">
          <Link href="/" className="text-xl font-serif tracking-widest uppercase text-white block">
            Wildlily Safari Resort
          </Link>
          <p className="text-xs leading-relaxed text-stone-400">
            A small guesthouse beside Udawalawe National Park with three air-conditioned rooms, an
            outdoor pool, home-cooked Sri Lankan food and safari jeeps arranged by the house.
          </p>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">Explore</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/about" className="hover:text-emerald-400 transition-colors">About the House</Link>
            </li>
            <li>
              <Link href="/rooms" className="hover:text-emerald-400 transition-colors">Rooms</Link>
            </li>
            <li>
              <Link href="/safari" className="hover:text-emerald-400 transition-colors">Safari Drives</Link>
            </li>
            <li>
              <Link href="/safari/drivers" className="hover:text-emerald-400 transition-colors">Meet the Drivers</Link>
            </li>
            <li>
              <Link href="/dining" className="hover:text-emerald-400 transition-colors">Food & Breakfast</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">Contact Desk</h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>South Canal, Old Deewara Road, Udawalawa 70190, Sri Lanka</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>+94 77 732 0237</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>reservations@wildlilysafariresort.com</span>
            </li>
          </ul>
        </div>

        {/* Guest Experience */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">Guest Sign-In</h4>
          <p className="text-xs text-stone-400">
            If you have been on a safari drive with us, sign in to rate your driver.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900 transition-colors text-xs font-medium"
          >
            Sign In &rarr;
          </Link>
        </div>
      </div>

      {/* Clean & Minimal Bottom Attribution */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 pt-8 border-t border-stone-850 flex flex-col sm:flex-row justify-between items-center text-[11px] text-stone-400 space-y-3 sm:space-y-0 font-mono">
        <p>&copy; {new Date().getFullYear()} Wildlily Safari Resort. All rights reserved.</p>
        <p className="text-stone-400">
          Built with <span className="text-stone-300 font-semibold">Platform OS</span> by{" "}
          <a
            href="https://spandhalabs.lk"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-300 hover:text-emerald-400 font-semibold transition-colors underline underline-offset-4"
          >
            Spandha Labs
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
