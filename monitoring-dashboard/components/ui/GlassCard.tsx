"use client";

import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  gradient?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, hover = false, gradient = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[12px] border border-[#ebebeb] bg-white",
          "transition-all duration-300 ease-out",
          hover &&
            "hover:border-[#d9d9d9] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:-translate-y-[1px]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
GlassCard.displayName = "GlassCard";

export { GlassCard };
export type { GlassCardProps };
