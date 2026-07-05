import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ── Tailwind class merge utility ──
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Format bytes to human-readable string ──
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

// ── Format bytes per second ──
export function formatBytesPerSec(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

// ── Format percentage ──
export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ── Format number with commas ──
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Get status color class for a percentage value ──
export function getPercentColor(
  value: number,
  warningThreshold: number,
  criticalThreshold: number
): string {
  if (value >= criticalThreshold) return "text-red-400";
  if (value >= warningThreshold) return "text-amber-400";
  return "text-emerald-400";
}

// ── Get status text for a check ──
export function getStatusText(value: boolean): string {
  return value ? "Healthy" : "Unhealthy";
}

// ── Get status color for a boolean ──
export function getStatusColor(value: boolean): string {
  return value ? "text-emerald-400" : "text-red-400";
}

// ── Format timestamp to relative time ──
export function timeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

// ── Truncate string ──
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}
