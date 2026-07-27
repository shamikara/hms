import Link from "next/link";
import { Compass, Mail, MapPin, Phone, Shield, Sparkles } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="bg-stone-950 text-stone-400 border-t border-stone-850 pt-16 pb-12 font-sans select-none">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        {/* Brand Column */}
        <div className="space-y-4">
          <Link href="/" className="text-xl font-serif tracking-widest uppercase text-white block">
            Lily Resort Udawalawe
          </Link>
          <p className="text-xs leading-relaxed text-stone-400">
            A 5-star sanctuary nestled on the boundary of Udawalawe National Park. Experience Sri Lanka's wildlife with unmatched luxury, zero-footprint eco-architecture, and personalized service.
          </p>
          <div className="flex items-center space-x-2 text-xs text-emerald-400 pt-2 font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>Certified Biosphere Eco-Lodge</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">Explore</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/about" className="hover:text-emerald-400 transition-colors">The Lodge & Heritage</Link>
            </li>
            <li>
              <Link href="/rooms" className="hover:text-emerald-400 transition-colors">Villas & Accommodation</Link>
            </li>
            <li>
              <Link href="/safari" className="hover:text-emerald-400 transition-colors">Safari Drives & Excursions</Link>
            </li>
            <li>
              <Link href="/dining" className="hover:text-emerald-400 transition-colors">Gastronomy & Bush Dining</Link>
            </li>
            <li>
              <Link href="/spa" className="hover:text-emerald-400 transition-colors">Wilderness Spa & Wellness</Link>
            </li>
            <li>
              <Link href="/packages" className="hover:text-emerald-400 transition-colors">Packages & Exclusive Offers</Link>
            </li>
            <li>
              <Link href="/sustainability" className="hover:text-emerald-400 transition-colors">Conservation & Sustainability</Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-emerald-400 transition-colors">Concierge & Transfers</Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">Contact Desk</h4>
          <ul className="space-y-2.5 text-xs">
            <li className="flex items-start space-x-2.5">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>National Park Road, Thimbolketiya, Udawalawe, Sri Lanka</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>+94 47 223 4567</span>
            </li>
            <li className="flex items-center space-x-2.5">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>reservations@lilyresortudawalawe.com</span>
            </li>
          </ul>
        </div>

        {/* Guest Experience & Spandha Ecosystem */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-widest font-mono">Guest Experience</h4>
            <p className="text-xs text-stone-400">
              Access your reservation details, pre-arrival concierge preferences, and safari schedules.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 hover:bg-emerald-900 transition-colors text-xs font-medium"
            >
              Access Guest Portal &rarr;
            </Link>
          </div>

          {/* Ecosystem Badge */}
          <div className="p-3 rounded-xl bg-stone-900 border border-stone-800/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-stone-300 font-semibold">Engineered by Spandha Labs</span>
              <Sparkles className="w-3 h-3 text-emerald-400" />
            </div>
            <p className="text-[10px] text-stone-400 italic">"Building software people remember."</p>
            <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <a
                href="https://spandhalabs.lk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline font-medium"
              >
                spandhalabs.lk
              </a>
              <span>Platform OS</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16 pt-8 border-t border-stone-850 flex flex-col md:flex-row justify-between items-center text-[11px] text-stone-400 space-y-4 md:space-y-0">
        <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-3">
          <p>&copy; {new Date().getFullYear()} Lily Resort Udawalawe. All rights reserved.</p>
          <span className="hidden sm:inline text-stone-700">•</span>
          <p className="text-stone-400 font-mono">
            A Product by{" "}
            <a
              href="https://spandhalabs.lk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:underline font-semibold"
            >
              Spandha Labs
            </a>
          </p>
        </div>

        <div className="flex items-center space-x-4 font-mono text-[10px] text-stone-400">
          <span>Built with <strong className="text-stone-300">Platform OS</strong></span>
          <span>•</span>
          <Link href="#" className="hover:text-stone-300 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="#" className="hover:text-stone-300 transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
