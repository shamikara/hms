import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <header className="absolute top-0 w-full z-50 py-6 px-8 lg:px-16 flex justify-between items-center text-stone-100">
        <h1 className="text-2xl font-serif tracking-widest uppercase text-white drop-shadow-md">Safari Resort</h1>
        <nav className="hidden md:flex space-x-8 text-sm font-medium tracking-wide">
          <Link href="/about" className="hover:text-emerald-300 transition-colors">The Lodge</Link>
          <Link href="/rooms" className="hover:text-emerald-300 transition-colors">Accommodation</Link>
          <Link href="/safari" className="hover:text-emerald-300 transition-colors">Experiences</Link>
          <Link href="/contact" className="hover:text-emerald-300 transition-colors">Contact</Link>
        </nav>
        <Link 
          href="/login" 
          className="px-6 py-2 border border-white/40 hover:bg-white hover:text-stone-900 rounded-full text-sm font-medium transition-all backdrop-blur-sm"
        >
          Guest Portal
        </Link>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center bg-stone-900 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-stone-950 z-10" />
          
          <div className="relative z-20 text-center px-4 max-w-4xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <span className="text-emerald-400 font-medium tracking-widest uppercase text-sm mb-6 block">Welcome to the Wilderness</span>
            <h2 className="text-5xl md:text-7xl font-serif text-white leading-tight mb-8 drop-shadow-lg">
              Untamed Luxury in the Heart of the Savannah
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/book" 
                className="px-8 py-4 bg-emerald-800 hover:bg-emerald-700 text-white font-medium tracking-wide rounded-sm transition-colors text-lg"
              >
                Reserve Your Stay
              </Link>
              <Link 
                href="/safari" 
                className="px-8 py-4 bg-transparent border border-white/50 text-white hover:bg-white/10 font-medium tracking-wide rounded-sm transition-colors text-lg"
              >
                Discover Safaris
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
