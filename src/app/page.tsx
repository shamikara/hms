import Link from "next/link";
import { ScrollReveal, ParallaxHero } from "@/components/ui/ScrollReveal";
import { BookingWidget } from "@/components/landing/BookingWidget";
import { RoomCarousel } from "@/components/landing/RoomCarousel";
import { MasonryGallery } from "@/components/landing/MasonryGallery";
import { LocationSection } from "@/components/landing/LocationSection";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <header className="absolute top-0 w-full z-50 py-6 px-8 lg:px-16 flex justify-between items-center text-stone-100">
        <ScrollReveal direction="down" delay={0.1} width="w-auto">
          <h1 className="text-2xl font-serif tracking-widest uppercase text-white drop-shadow-md">Udawalawe Resort</h1>
        </ScrollReveal>
        
        <ScrollReveal direction="down" delay={0.2} width="w-auto" className="hidden md:block">
          <nav className="flex space-x-8 text-sm font-medium tracking-wide drop-shadow-md">
            <Link href="/about" className="hover:text-emerald-300 transition-colors">The Lodge</Link>
            <Link href="/rooms" className="hover:text-emerald-300 transition-colors">Accommodation</Link>
            <Link href="/safari" className="hover:text-emerald-300 transition-colors">Experiences</Link>
            <Link href="/contact" className="hover:text-emerald-300 transition-colors">Contact</Link>
          </nav>
        </ScrollReveal>

        <ScrollReveal direction="down" delay={0.3} width="w-auto">
          <Link 
            href="/login" 
            className="px-6 py-2 border border-white/40 hover:bg-white hover:text-stone-900 rounded-full text-sm font-medium transition-all backdrop-blur-sm"
          >
            Guest Portal
          </Link>
        </ScrollReveal>
      </header>

      <main>
        {/* Hero Section */}
        <ParallaxHero imageSrc="/hero-bg-udawalawe.png" alt="Udawalawe luxury safari lodge at sunset">
          <ScrollReveal delay={0.4}>
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-6 block">Welcome to Sri Lanka</span>
          </ScrollReveal>
          <ScrollReveal delay={0.6}>
            <h2 className="text-5xl md:text-7xl font-serif text-white leading-tight mb-8 drop-shadow-lg">
              Untamed Luxury by Udawalawe
            </h2>
          </ScrollReveal>
          <BookingWidget />
        </ParallaxHero>

        {/* Accommodation Carousel Section */}
        <section className="py-24 px-8 lg:px-16 bg-stone-950 text-stone-100 relative z-20 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <RoomCarousel />
          </div>
        </section>

        {/* Photo Gallery Section */}
        <section className="py-24 bg-stone-900 text-stone-100 overflow-hidden">
          <div className="mx-auto px-4 md:px-8">
            <MasonryGallery />
          </div>
        </section>

        {/* Location & Map Section */}
        <LocationSection />

      </main>

      <footer className="bg-black py-12 text-center text-stone-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Udawalawe Resort. All rights reserved.</p>
      </footer>
    </div>
  );
}
