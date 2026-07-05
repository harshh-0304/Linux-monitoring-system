// ── MetricSnapshot — returned by GET /metrics and GET /metrics/current ──
export interface MetricSnapshot {
  id: number;
  timestamp: string; // ISO 8601
  cpu_percent: number; // 0–100
  cpu_count: number;
  ram_total_mb: number;
  ram_used_mb: number;
  ram_percent: number; // 0–100
  disk_total_gb: number;
  disk_used_gb: number;
  disk_percent: number; // 0–100
  net_bytes_sent: number; // bytes/sec (rate)
  net_bytes_recv: number; // bytes/sec (rate)
  load_avg_1: number | null;
  load_avg_5: number | null;
  load_avg_15: number | null;
}

// ── StatsResponse — returned by GET /metrics/stats ──
export interface StatsResponse {
  avg_cpu_percent: number;
  max_cpu_percent: number;
  avg_ram_percent: number;
  max_ram_percent: number;
  avg_disk_percent: number;
  snapshot_count: number;
  period_hours: number;
}

// ── MetricsQueryParams — used for GET /metrics ──
export interface MetricsQueryParams {
  hours?: number; // 1–168, default 1
  limit?: number; // 1–1000, default 100
}

// ── StatsQueryParams — used for GET /metrics/stats ──
export interface StatsQueryParams {
  hours?: number; // 1–168, default 24
}

// ── CollectionResult — returned by POST /metrics/collect ──
export interface CollectionResult {
  message: string;
  snapshot_id: number;
  cpu_percent: number;
  ram_percent: number;
  disk_percent: number;
}

// ── LiveMetrics (alias for MetricSnapshot without id) ──
export type LiveMetrics = Omit<MetricSnapshot, "id">;
