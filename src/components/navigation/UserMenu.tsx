"use client";

import * as React from "react";
import { User, Settings, Shield, LogOut, Sparkles, Building } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface UserMenuProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export function UserMenu({
  userName = "Alexander Wright",
  userRole = "Super Admin",
  userAvatar,
}: UserMenuProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 rounded-lg p-1 hover:bg-stone-100 dark:hover:bg-stone-800/80 transition-colors cursor-pointer outline-none">
          <Avatar className="h-7 w-7 border-stone-300 dark:border-stone-700">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-stone-900 dark:text-stone-100 leading-none">
              {userName}
            </span>
            <span className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
              {userRole}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-medium leading-none text-stone-900 dark:text-stone-100">
              {userName}
            </p>
            <p className="text-[11px] leading-none text-stone-500 dark:text-stone-400 font-mono">
              admin@safariresort.com
            </p>
            <div className="pt-1">
              <Badge variant="emerald" className="text-[9px] px-1.5 py-0">
                {userRole}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-3.5 w-3.5 text-stone-500" />
            <span>Profile & Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-3.5 w-3.5 text-stone-500" />
            <span>Resort Settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Shield className="mr-2 h-3.5 w-3.5 text-stone-500" />
            <span>Security & Audit Log</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/40">
          <LogOut className="mr-2 h-3.5 w-3.5" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
