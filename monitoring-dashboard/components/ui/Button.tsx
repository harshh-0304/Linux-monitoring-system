"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 border border-blue-500/30",
  secondary:
    "bg-white/[0.06] hover:bg-white/[0.10] text-gray-200 border border-white/[0.08]",
  ghost:
    "bg-transparent hover:bg-white/[0.06] text-gray-300 border border-transparent",
  danger:
    "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 border border-red-500/30",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg",
          "transition-all duration-200 ease-out",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-0",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
export type { ButtonVariant, ButtonSize, ButtonProps };
