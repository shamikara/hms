"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Search, Plus, Menu, ChevronRight, Sparkles } from "lucide-react";
import { NotificationCenter } from "./NotificationCenter";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";
import { HMS_NAVIGATION_CONFIG } from "./navigation.config";

interface TopHeaderProps {
  isSidebarCollapsed: boolean;
  onOpenCommandPalette: () => void;
  onToggleMobileMenu?: () => void;
}

export function TopHeader({
  isSidebarCollapsed,
  onOpenCommandPalette,
  onToggleMobileMenu,
}: TopHeaderProps) {
  const pathname = usePathname();

  // Find page title from nav config
  const currentPageTitle = React.useMemo(() => {
    for (const group of HMS_NAVIGATION_CONFIG) {
      for (const item of group.items) {
        if (item.href === pathname) return item.title;
      }
    }
    if (pathname.includes("/admin/bookings")) return "Bookings & Check-in";
    if (pathname.includes("/admin/dashboard")) return "Executive Dashboard";
    if (pathname.includes("/admin/rooms")) return "Room Inventory";
    if (pathname.includes("/admin/guests")) return "Guest CRM";
    if (pathname.includes("/admin/safari")) return "Safari Operations";
    if (pathname.includes("/admin/restaurant")) return "Dining POS";
    if (pathname.includes("/admin/finance")) return "Revenue & Finance";
    return "Enterprise Platform";
  }, [pathname]);

  return (
    <header className="sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-stone-200 bg-white/90 px-4 backdrop-blur-md dark:border-stone-800 dark:bg-stone-900/90 transition-all select-none">
      {/* Left Title & Breadcrumbs */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleMobileMenu}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 md:hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center space-x-2 text-xs truncate">
          <span className="hidden sm:inline font-semibold text-stone-500 dark:text-stone-400">
            HMS Enterprise
          </span>
          <ChevronRight className="hidden sm:inline h-3.5 w-3.5 text-stone-400" />
          <h1 className="font-semibold text-stone-900 dark:text-stone-100 truncate">
            {currentPageTitle}
          </h1>
        </div>
      </div>

      {/* Right Search, Actions, Notifications & User */}
      <div className="flex items-center space-x-2.5">
        {/* Search Command Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center space-x-2 rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-500 hover:border-stone-300 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:border-stone-700 dark:hover:bg-stone-800/80 transition-colors cursor-pointer"
        >
          <Search className="h-3.5 w-3.5 text-stone-400" />
          <span className="text-xs">Quick search...</span>
          <kbd className="rounded border border-stone-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-stone-400 dark:border-stone-700 dark:bg-stone-800">
            ⌘K
          </kbd>
        </button>

        {/* Quick Action Button */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenCommandPalette}
          className="hidden md:inline-flex items-center space-x-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Action</span>
        </Button>

        <div className="h-4 w-px bg-stone-200 dark:bg-stone-800 mx-1" />

        {/* Notifications & User */}
        <NotificationCenter />
        <UserMenu />
      </div>
    </header>
  );
}
