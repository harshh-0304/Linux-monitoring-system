"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-white/[0.06]",
        className
      )}
    />
  );
}

// ── Card skeleton (used for loading states) ──
export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-4">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

// ── Chart skeleton ──
export function ChartSkeleton({ height = "h-64" }: { height?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className={cn("w-full", height)} />
      <div className="flex gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// ── Table skeleton ──
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-6 space-y-3">
      <Skeleton className="h-4 w-40 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 flex-1" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}
