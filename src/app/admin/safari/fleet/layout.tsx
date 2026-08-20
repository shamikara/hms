import * as React from "react";
import { Compass } from "lucide-react";
import { FleetNav } from "@/features/fleet/components/FleetNav";

/**
 * Shell for the Safari Fleet Operations section.
 *
 * Every page below reads live operational data, so the whole section is
 * rendered per request rather than prerendered.
 */
export const dynamic = "force-dynamic";

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Compass className="h-4 w-4" />
          <span className="text-[10px] font-mono uppercase tracking-wider">
            Safari fleet operations
          </span>
        </div>
        <h1 className="text-3xl font-serif tracking-tight text-stone-900 dark:text-white">
          Fleet Operations
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Vehicles, drivers, dispatch, maintenance, compliance and guest-rated quality —
          one operational record per safari.
        </p>
      </header>

      <FleetNav />

      {children}
    </div>
  );
}
