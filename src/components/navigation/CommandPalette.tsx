"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Compass,
  BedDouble,
  Users,
  LayoutDashboard,
  Receipt,
  UtensilsCrossed,
  Truck,
  PlusCircle,
  Building2,
  Moon,
  Sun,
  Laptop,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/components/ui/command";
import { HMS_PROPERTIES } from "./navigation.config";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = RouterHook();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = React.useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search modules..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/dashboard"))}
          >
            <LayoutDashboard className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/bookings"))}
          >
            <Calendar className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Bookings & Reservation Management</span>
            <CommandShortcut>G B</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/rooms"))}
          >
            <BedDouble className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Room Inventory</span>
            <CommandShortcut>G R</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/guests"))}
          >
            <Users className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Guest CRM</span>
            <CommandShortcut>G G</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/safari"))}
          >
            <Compass className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Safari Operations</span>
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/safari/fleet"))}
          >
            <Truck className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Safari Fleet Operations</span>
            <CommandShortcut>G V</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/restaurant"))}
          >
            <UtensilsCrossed className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Dining & Restaurant POS</span>
            <CommandShortcut>G P</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/finance"))}
          >
            <Receipt className="mr-2 h-4 w-4 text-emerald-500" />
            <span>Revenue & Finance Reports</span>
            <CommandShortcut>G F</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/bookings?action=new"))}
          >
            <PlusCircle className="mr-2 h-4 w-4 text-emerald-400" />
            <span>New Reservation</span>
            <CommandShortcut>N B</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/admin/safari?action=new"))}
          >
            <Compass className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Book Safari Game Drive</span>
            <CommandShortcut>N S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Switch Resort Property">
          {HMS_PROPERTIES.map((prop) => (
            <CommandItem
              key={prop.id}
              onSelect={() =>
                runCommand(() => {
                  console.log("Switch property to:", prop.name);
                })
              }
            >
              <Building2 className="mr-2 h-4 w-4 text-stone-400" />
              <span>{prop.name}</span>
              <CommandShortcut>{prop.code}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

// Fallback router hook wrapper
function RouterHook() {
  return useRouter();
}
