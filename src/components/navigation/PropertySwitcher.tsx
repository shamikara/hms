"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { HMS_PROPERTIES, Property } from "./navigation.config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PropertySwitcherProps {
  isCollapsed?: boolean;
  onSelectProperty?: (property: Property) => void;
}

export function PropertySwitcher({
  isCollapsed = false,
  onSelectProperty,
}: PropertySwitcherProps) {
  const [selectedProperty, setSelectedProperty] = React.useState<Property>(
    HMS_PROPERTIES[0]
  );

  const handleSelect = (property: Property) => {
    setSelectedProperty(property);
    if (onSelectProperty) onSelectProperty(property);
  };

  const IconComp = selectedProperty.icon;

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700 hover:text-white transition-colors border border-stone-700/50 cursor-pointer"
            title={selectedProperty.name}
          >
            <IconComp className="h-4 w-4 text-emerald-400" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Properties</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {HMS_PROPERTIES.map((prop) => (
            <DropdownMenuItem
              key={prop.id}
              onClick={() => handleSelect(prop)}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                <prop.icon className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-xs font-medium">{prop.name}</span>
              </div>
              {prop.id === selectedProperty.id && (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border border-stone-800 bg-stone-900/90 px-3 py-2 text-left hover:bg-stone-800/90 transition-all cursor-pointer group">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-950 border border-emerald-800/50 text-emerald-400">
              <IconComp className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center space-x-1.5">
                <span className="truncate text-xs font-semibold text-stone-200">
                  {selectedProperty.name}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">
                {selectedProperty.code} • {selectedProperty.location.split(",")[0]}
              </span>
            </div>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-300 shrink-0 ml-1" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Select Resort Property</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {HMS_PROPERTIES.map((prop) => {
          const ItemIcon = prop.icon;
          const isSelected = prop.id === selectedProperty.id;
          return (
            <DropdownMenuItem
              key={prop.id}
              onClick={() => handleSelect(prop)}
              className="flex items-center justify-between py-2 cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md border text-xs",
                    isSelected
                      ? "border-emerald-700 bg-emerald-950 text-emerald-400"
                      : "border-stone-800 bg-stone-900 text-stone-400"
                  )}
                >
                  <ItemIcon className="h-3 w-3" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-stone-200">
                    {prop.name}
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {prop.code}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <Badge
                  variant={prop.status === "PEAK" ? "amber" : "emerald"}
                  className="text-[9px] px-1.5 py-0"
                >
                  {prop.status}
                </Badge>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
