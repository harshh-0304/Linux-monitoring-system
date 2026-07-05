// ── Application constants ──

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Linux Server Monitor";
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0";

// ── API ──
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

// ── Refresh intervals (ms) ──
export const DEFAULT_REFRESH_INTERVAL = Number(
  process.env.NEXT_PUBLIC_REFRESH_INTERVAL || "30000"
);

export const FAST_REFRESH_INTERVAL = 10_000; // 10s for live metrics
export const NORMAL_REFRESH_INTERVAL = 30_000; // 30s for most data
export const SLOW_REFRESH_INTERVAL = 60_000; // 60s for history

// ── Time ranges for metrics ──
export const TIME_RANGES = [
  { label: "Last 1 hour", hours: 1 },
  { label: "Last 6 hours", hours: 6 },
  { label: "Last 12 hours", hours: 12 },
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 168 },
] as const;

// ── Alert severity colors ──
export const SEVERITY_COLORS = {
  critical: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/20 text-red-300",
    glow: "shadow-red-500/20",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
    glow: "shadow-amber-500/20",
  },
  none: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
    glow: "shadow-emerald-500/20",
  },
} as const;

// ── Telegram status colors ──
export const TELEGRAM_STATUS_COLORS: Record<string, string> = {
  sent: "text-emerald-400",
  suppressed: "text-amber-400",
  failed: "text-red-400",
  pending: "text-gray-400",
};

// ── Metric display config ──
export const METRIC_CONFIG = {
  cpu: {
    label: "CPU",
    unit: "%",
    icon: "Cpu",
    thresholds: { warning: 80, critical: 95 },
    color: "#3b82f6",
    gradient: "from-blue-500 to-blue-600",
  },
  ram: {
    label: "RAM",
    unit: "%",
    icon: "MemoryStick",
    thresholds: { warning: 85, critical: 95 },
    color: "#8b5cf6",
    gradient: "from-purple-500 to-purple-600",
  },
  disk: {
    label: "Disk",
    unit: "%",
    icon: "HardDrive",
    thresholds: { warning: 85, critical: 95 },
    color: "#10b981",
    gradient: "from-emerald-500 to-emerald-600",
  },
} as const;

// ── Navigation ──
export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Metrics", href: "/metrics", icon: "BarChart3" },
  { label: "Alerts", href: "/alerts", icon: "Bell" },
  { label: "AI Insights", href: "/ai-insights", icon: "Brain" },
  { label: "System Health", href: "/health", icon: "Activity" },
] as const;

// ── Mock data flag ──
export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true";
