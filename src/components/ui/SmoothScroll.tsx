"use client";

import { ReactNode } from "react";

export function SmoothScroll({ children }: { children: ReactNode }) {
  // Direct pass-through for native enterprise scrolling performance
  return <>{children}</>;
}
