import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-wide uppercase",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-stone-900 text-stone-50 dark:bg-stone-100 dark:text-stone-950",
        secondary:
          "border-transparent bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-300",
        destructive:
          "border-transparent bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800/40",
        outline:
          "text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800",
        emerald:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300",
        amber:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300",
        blue:
          "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/50 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
