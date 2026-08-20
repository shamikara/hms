"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Truck,
  IdCard,
  CalendarClock,
  Wrench,
  Fuel,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Sub-navigation for the fleet section, styled like the admin nav. */
const FLEET_TABS = [
  { href: "/admin/safari/fleet", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/safari/fleet/trips", label: "Dispatch", icon: CalendarClock },
  { href: "/admin/safari/fleet/vehicles", label: "Vehicles", icon: Truck },
  { href: "/admin/safari/fleet/drivers", label: "Drivers", icon: IdCard },
  { href: "/admin/safari/fleet/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/admin/safari/fleet/fuel", label: "Fuel", icon: Fuel },
  { href: "/admin/safari/fleet/documents", label: "Documents", icon: FileText },
];

export function FleetNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-stone-200 dark:border-stone-800 -mx-1 px-1">
      {FLEET_TABS.map((tab) => {
        const isActive =
          tab.href === "/admin/safari/fleet"
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors",
              isActive
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
