"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchLiveMetrics,
  fetchMetricsHistory,
  fetchMetricsStats,
  triggerCollection,
} from "@/services/metrics";
import {
  FAST_REFRESH_INTERVAL,
  NORMAL_REFRESH_INTERVAL,
} from "@/lib/constants";
import type { MetricsQueryParams, StatsQueryParams } from "@/types/metrics";

// ── Key factory ──
export const metricsKeys = {
  live: ["metrics", "live"] as const,
  history: (params: MetricsQueryParams) =>
    ["metrics", "history", params] as const,
  stats: (params: StatsQueryParams) => ["metrics", "stats", params] as const,
};

// ── Live metrics (auto-refresh every 10s) ──
export function useLiveMetrics() {
  return useQuery({
    queryKey: metricsKeys.live,
    queryFn: fetchLiveMetrics,
    refetchInterval: FAST_REFRESH_INTERVAL,
    staleTime: FAST_REFRESH_INTERVAL - 2000,
    retry: 2,
  });
}

// ── Historical metrics ──
export function useMetricsHistory(params: MetricsQueryParams = {}) {
  return useQuery({
    queryKey: metricsKeys.history(params),
    queryFn: () => fetchMetricsHistory(params),
    refetchInterval: NORMAL_REFRESH_INTERVAL,
    staleTime: NORMAL_REFRESH_INTERVAL - 5000,
    retry: 2,
  });
}

// ── Aggregated stats ──
export function useMetricsStats(params: StatsQueryParams = {}) {
  return useQuery({
    queryKey: metricsKeys.stats(params),
    queryFn: () => fetchMetricsStats(params),
    refetchInterval: NORMAL_REFRESH_INTERVAL,
    staleTime: NORMAL_REFRESH_INTERVAL - 5000,
    retry: 2,
  });
}

// ── Manual collection mutation ──
export function useTriggerCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerCollection,
    onSuccess: () => {
      // Invalidate both live and history so they refetch
      queryClient.invalidateQueries({ queryKey: ["metrics"] });
    },
  });
}
