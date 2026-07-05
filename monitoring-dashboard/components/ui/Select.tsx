"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, forwardRef } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full appearance-none rounded-lg border border-white/[0.08]",
            "bg-white/[0.04] px-3 py-2 pr-10 text-sm text-gray-200",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40",
            "transition-all duration-200",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" className="bg-gray-900">
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-900">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
export type { SelectProps };
