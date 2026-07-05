"use client";

import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { Skeleton } from "./Skeleton";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; positive: boolean };
  color?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color,
  loading = false,
  className,
  onClick,
}: StatCardProps) {
  if (loading) {
    return (
      <GlassCard className="p-5">
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      hover
      className={cn("p-5", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[var(--color-mute)] uppercase font-mono tracking-wider">
            {title}
          </p>
          <p
            className={cn(
              "text-2xl font-bold tracking-tight",
              color || "text-[var(--color-ink)]"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--color-mute)]">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "p-2.5 rounded-[6px]",
              color
                ? "bg-[var(--color-hairline-soft)]"
                : "bg-[#0070f3]/10 text-[var(--color-link)]"
            )}
          >
            <Icon
              className={cn("h-5 w-5", color || "text-[var(--color-ink)]")}
            />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-emerald-400" : "text-red-400"
            )}
          >
            {trend.positive ? "+" : ""}
            {trend.value.toFixed(1)}%
          </span>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>
      )}
    </GlassCard>
  );
}
