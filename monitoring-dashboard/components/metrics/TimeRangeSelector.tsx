"use client";
// Time range selection controls

import { TIME_RANGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

interface TimeRangeSelectorProps {
  value: number;
  onChange: (hours: number) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-[var(--color-mute)]" />
      <div className="flex gap-1">
        {TIME_RANGES.map((range) => (
          <button
            key={range.hours}
            onClick={() => onChange(range.hours)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
              value === range.hours
                ? "bg-[var(--color-ink)] text-white border border-transparent shadow-sm"
                : "bg-white text-[var(--color-body)] border border-[#ebebeb] hover:bg-[#f2f2f2] hover:text-[var(--color-ink)]"
            )}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
