import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98] transition-all duration-150",
  {
    variants: {
      variant: {
        default:
          "bg-stone-900 text-stone-50 shadow-xs hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white",
        primary:
          "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
        destructive:
          "bg-red-600 text-white shadow-xs hover:bg-red-700 dark:bg-red-900/80 dark:text-red-200 dark:hover:bg-red-800",
        outline:
          "border border-stone-200 bg-white shadow-xs hover:bg-stone-100 hover:text-stone-900 dark:border-stone-800 dark:bg-stone-900/50 dark:hover:bg-stone-800 dark:text-stone-200 dark:hover:text-white",
        secondary:
          "bg-stone-100 text-stone-900 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700",
        ghost:
          "hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800/80 dark:hover:text-white dark:text-stone-400",
        link: "text-emerald-600 underline-offset-4 hover:underline dark:text-emerald-400",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        xs: "h-6 px-2 text-[11px]",
        sm: "h-7 px-2.5 text-xs",
        lg: "h-10 px-4 text-sm",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
