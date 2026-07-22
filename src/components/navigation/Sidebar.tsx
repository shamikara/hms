"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Star,
  Search,
  SlidersHorizontal,
  LogOut,
  User,
  Sparkles,
} from "lucide-react";
import { HMS_NAVIGATION_CONFIG, NavGroup, NavItem } from "./navigation.config";
import { PropertySwitcher } from "./PropertySwitcher";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleCollapse: () => void;
  onOpenCommandPalette: () => void;
  userRole?: string;
}

export function Sidebar({
  isCollapsed,
  isMobileOpen = false,
  onCloseMobile,
  onToggleCollapse,
  onOpenCommandPalette,
  userRole = "SUPER_ADMIN",
}: SidebarProps) {
  const pathname = usePathname();
  const [favorites, setFavorites] = React.useState<string[]>([
    "/admin/bookings",
    "/admin/safari",
  ]);

  const toggleFavorite = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <motion.aside
        initial={false}
        animate={{
          width: isCollapsed ? 64 : 240,
        }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-stone-950 text-stone-300 border-r border-stone-800 select-none shadow-xl transition-transform md:translate-x-0 duration-200 ease-in-out",
          isMobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Top Property Header */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-stone-800/80">
          <PropertySwitcher isCollapsed={isCollapsed} />
        </div>

        {/* Search Command Trigger */}
        <div className="p-2 border-b border-stone-800/60">
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenCommandPalette}
                  className="flex h-9 w-full items-center justify-center rounded-md bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors border border-stone-800 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Search / Command (Ctrl+K)</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={onOpenCommandPalette}
              className="flex w-full items-center justify-between rounded-md border border-stone-800 bg-stone-900/60 px-2.5 py-1.5 text-xs text-stone-400 hover:bg-stone-800/80 hover:text-stone-200 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Search className="h-3.5 w-3.5 text-stone-500" />
                <span>Search or jump to...</span>
              </div>
              <kbd className="rounded border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono text-stone-400">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-none">
          {HMS_NAVIGATION_CONFIG.map((group, groupIdx) => {
            // Filter by role if specified
            const visibleItems = group.items.filter(
              (item) => !item.roles || item.roles.includes(userRole)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-stone-400 font-mono">
                    {group.groupLabel}
                  </div>
                )}

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href;
                    const isFav = favorites.includes(item.href);
                    const IconComponent = item.icon;

                    if (isCollapsed) {
                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>
                            <Link
                              href={item.href}
                              onClick={onCloseMobile}
                              className={cn(
                                "flex h-9 w-full items-center justify-center rounded-md text-xs font-medium transition-all relative",
                                isActive
                                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/50"
                                  : "text-stone-400 hover:bg-stone-900 hover:text-stone-100"
                              )}
                            >
                              <IconComponent className="h-4 w-4" />
                              {item.badge && (
                                <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              )}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="flex items-center space-x-2">
                            <span>{item.title}</span>
                            {item.shortcut && (
                              <span className="text-[10px] text-stone-400 font-mono">
                                ({item.shortcut})
                              </span>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={cn(
                          "group flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-all",
                          isActive
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 shadow-xs"
                            : "text-stone-400 hover:bg-stone-900/80 hover:text-stone-100"
                        )}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <IconComponent
                            className={cn(
                              "h-4 w-4 shrink-0 transition-colors",
                              isActive
                                ? "text-emerald-400"
                                : "text-stone-400 group-hover:text-stone-200"
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {item.badge && (
                            <Badge
                              variant={item.badgeVariant || "default"}
                              className="text-[9px] px-1.5 py-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(e, item.href)}
                            className={cn(
                              "p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-stone-800",
                              isFav && "opacity-100 text-amber-400"
                            )}
                            title={isFav ? "Remove favorite" : "Add to favorites"}
                          >
                            <Star
                              className={cn(
                                "h-3 w-3",
                                isFav ? "fill-amber-400 text-amber-400" : "text-stone-500"
                              )}
                            />
                          </button>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Controls & Collapse Toggle */}
        <div className="p-2 border-t border-stone-800/80 flex items-center justify-between bg-stone-950">
          {!isCollapsed && (
            <div className="flex items-center space-x-2 px-2 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-mono text-stone-400">HMS v1.0 • ONLINE</span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapse}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border border-stone-800 bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors cursor-pointer",
                  isCollapsed && "mx-auto"
                )}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar (Ctrl+B)"}
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
