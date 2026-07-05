"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHealthCheck, fetchReadiness } from "@/services/health";
import { NORMAL_REFRESH_INTERVAL } from "@/lib/constants";

// ── Key factory ──
export const healthKeys = {
  check: ["health", "check"] as const,
  readiness: ["health", "readiness"] as const,
};

// ── Health check ──
export function useHealthCheck() {
  return useQuery({
    queryKey: healthKeys.check,
    queryFn: fetchHealthCheck,
    refetchInterval: NORMAL_REFRESH_INTERVAL,
    staleTime: NORMAL_REFRESH_INTERVAL - 5000,
    retry: 2,
  });
}

// ── Readiness check ──
export function useReadiness() {
  return useQuery({
    queryKey: healthKeys.readiness,
    queryFn: fetchReadiness,
    refetchInterval: NORMAL_REFRESH_INTERVAL,
    staleTime: NORMAL_REFRESH_INTERVAL - 5000,
    retry: 2,
  });
}
