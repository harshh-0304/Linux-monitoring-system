import apiClient, { apiCall } from "./api";
import type {
  MetricSnapshot,
  StatsResponse,
  MetricsQueryParams,
  StatsQueryParams,
  CollectionResult,
} from "@/types/metrics";
import {
  mockLiveMetrics,
  mockMetricHistory,
  mockStats,
  mockCollectionResult,
} from "@/lib/mock-data";

// ── GET /metrics/current — Live metrics from OS ──
export async function fetchLiveMetrics(): Promise<Omit<MetricSnapshot, "id">> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<Omit<MetricSnapshot, "id">>(
        "/metrics/current"
      );
      return data;
    },
    mockLiveMetrics
  );
}

// ── GET /metrics — Historical snapshots ──
export async function fetchMetricsHistory(
  params?: MetricsQueryParams
): Promise<MetricSnapshot[]> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<MetricSnapshot[]>("/metrics", {
        params: {
          hours: params?.hours ?? 1,
          limit: params?.limit ?? 100,
        },
      });
      return data;
    },
    () => mockMetricHistory(params?.hours ?? 1, params?.limit ?? 100)
  );
}

// ── GET /metrics/stats — Aggregated stats ──
export async function fetchMetricsStats(
  params?: StatsQueryParams
): Promise<StatsResponse> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<StatsResponse>("/metrics/stats", {
        params: { hours: params?.hours ?? 24 },
      });
      return data;
    },
    () => mockStats(params?.hours ?? 24)
  );
}

// ── POST /metrics/collect — Trigger manual collection ──
export async function triggerCollection(): Promise<CollectionResult> {
  return apiCall(
    async () => {
      const { data } = await apiClient.post<CollectionResult>(
        "/metrics/collect"
      );
      return data;
    },
    mockCollectionResult
  );
}
