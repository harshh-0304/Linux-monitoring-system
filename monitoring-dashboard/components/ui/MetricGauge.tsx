"use client";

import { cn, getPercentColor } from "@/lib/utils";

interface MetricGaugeProps {
  label: string;
  value: number;
  max?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  unit?: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}

export function MetricGauge({
  label,
  value,
  max = 100,
  warningThreshold = 80,
  criticalThreshold = 95,
  unit = "%",
  size = "md",
  color,
}: MetricGaugeProps) {
  const pct = Math.min((value / max) * 100, 100);
  const textColor = color || getPercentColor(value, warningThreshold, criticalThreshold);

  const barHeight = size === "sm" ? "h-1.5" : size === "md" ? "h-2" : "h-3";
  const valueSize = size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl";
  const labelSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={cn("font-medium text-gray-400", labelSize)}>
          {label}
        </span>
        <span className={cn("font-bold tabular-nums", valueSize, textColor)}>
          {value.toFixed(1)}
          {unit}
        </span>
      </div>
      <div
        className={cn(
          "w-full rounded-full bg-white/[0.06] overflow-hidden",
          barHeight
        )}
      >
        <div
          className={cn(
            "rounded-full transition-all duration-500 ease-out",
            barHeight,
            textColor.includes("emerald")
              ? "bg-emerald-500"
              : textColor.includes("amber")
              ? "bg-amber-500"
              : "bg-red-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>0{unit}</span>
        <span>Warning: {warningThreshold}{unit}</span>
        <span>Critical: {criticalThreshold}{unit}</span>
      </div>
    </div>
  );
}
