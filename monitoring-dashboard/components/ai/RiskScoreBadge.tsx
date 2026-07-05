"use client";

import { cn } from "@/lib/utils";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import type { AISeverity } from "@/types/ai";

interface RiskScoreBadgeProps {
  severity: AISeverity;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const config: Record<
  AISeverity,
  { color: string; bg: string; label: string; icon: typeof Shield }
> = {
  none: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Low Risk",
    icon: ShieldCheck,
  },
  warning: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Medium Risk",
    icon: ShieldAlert,
  },
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    label: "High Risk",
    icon: ShieldAlert,
  },
};

export function RiskScoreBadge({
  severity,
  size = "md",
  showLabel = true,
}: RiskScoreBadgeProps) {
  const cfg = config[severity];
  const Icon = cfg.icon;

  const sizeClasses = {
    sm: "px-2 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-base gap-2",
  };

  const iconSizes = { sm: 12, md: 14, lg: 18 };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium border",
        cfg.bg,
        cfg.color,
        "border-transparent",
        sizeClasses[size]
      )}
    >
      <Icon size={iconSizes[size]} />
      {showLabel && <span>{cfg.label}</span>}
    </div>
  );
}
