"use client";

import * as React from "react";
import { Sidebar } from "@/components/navigation/Sidebar";
import { TopHeader } from "@/components/navigation/TopHeader";
import { CommandPalette } from "@/components/navigation/CommandPalette";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  // Toggle sidebar via shortcut (Ctrl + B or Meta + B)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans antialiased text-stone-900 dark:text-stone-100 selection:bg-emerald-200 selection:text-emerald-900 flex relative">
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Enterprise Navigation Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Main Workspace Layout Area */}
      <div
        className={`flex flex-1 flex-col transition-all duration-200 min-h-screen w-full ${
          isCollapsed ? "md:ml-[64px]" : "md:ml-[240px]"
        }`}
      >
        {/* Sticky Header Bar */}
        <TopHeader
          isSidebarCollapsed={isCollapsed}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
        />

        {/* High-density Enterprise Content View */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  );
}
