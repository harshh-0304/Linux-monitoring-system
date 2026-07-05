"use client";

import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "default" | "warning" | "critical" | "success" | "info" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/[0.08] text-gray-300 border-white/[0.08]",
  warning:
    "bg-amber-500/15 text-amber-300 border-amber-500/20",
  critical: "bg-red-500/15 text-red-300 border-red-500/20",
  success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  info: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  outline: "bg-transparent text-gray-400 border-white/[0.10]",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "sm", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium rounded-full border whitespace-nowrap",
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
export type { BadgeVariant, BadgeProps };
