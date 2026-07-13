import Link from "next/link";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex selection:bg-emerald-200 selection:text-emerald-900 font-sans">
      {/* Premium Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col fixed h-full border-r border-stone-800 transition-all">
        <div className="h-20 flex items-center px-8 border-b border-stone-800">
          <h1 className="text-lg font-serif text-white tracking-widest uppercase">Safari Resort</h1>
        </div>
        
        <nav className="flex-1 py-8 px-4 space-y-1 overflow-y-auto scrollbar-hide">
          <NavItem href="/admin/dashboard" label="Dashboard" />
          <NavItem href="/admin/bookings" label="Bookings" />
          <NavItem href="/admin/rooms" label="Rooms" />
          <NavItem href="/admin/guests" label="Guest CRM" />
          <NavItem href="/admin/safari" label="Safari Operations" />
          <NavItem href="/admin/restaurant" label="Restaurant" />
          <NavItem href="/admin/finance" label="Finance" />
        </nav>
        
        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center space-x-3 px-4 py-3 bg-stone-800/40 hover:bg-stone-800/80 cursor-pointer rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-sm font-medium shadow-inner">
              SA
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-stone-200">System Admin</span>
              <span className="text-xs text-stone-500">Super Admin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative">
        <header className="h-20 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 flex items-center px-8 justify-between sticky top-0 z-10">
          <h2 className="text-lg font-medium text-stone-800 dark:text-stone-200">Overview</h2>
          <div className="flex space-x-4 items-center">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online"></div>
             <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Live</span>
          </div>
        </header>
        <div className="p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link 
      href={href} 
      className="block px-4 py-3 rounded-lg text-sm font-medium text-stone-400 hover:bg-stone-800 hover:text-white transition-all duration-300"
    >
      {label}
    </Link>
  );
}
