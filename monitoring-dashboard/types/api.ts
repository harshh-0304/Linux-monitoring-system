// ── HealthCheck — returned by GET / ──
export interface HealthCheck {
  status: string;
  service: string;
}

// ── ReadinessCheck — returned by GET /readyz ──
export interface ReadinessCheck {
  status: "ready" | "not ready";
  scheduler_running?: boolean;
  last_metric_age_seconds?: number;
  issues?: string[];
}

// ── API Error response ──
export interface ApiError {
  detail: string | ApiErrorDetail[];
}

export interface ApiErrorDetail {
  type: string;
  loc: string[];
  msg: string;
  input: unknown;
}

// ── Generic API response wrapper ──
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  isError: boolean;
}
