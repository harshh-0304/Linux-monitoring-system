import apiClient, { apiCall } from "./api";
import type { HealthCheck, ReadinessCheck } from "@/types/api";
import { mockHealthCheck, mockReadiness } from "@/lib/mock-data";

// ── GET / — Health check ──
export async function fetchHealthCheck(): Promise<HealthCheck> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<HealthCheck>("/");
      return data;
    },
    mockHealthCheck
  );
}

// ── GET /readyz — Readiness check ──
export async function fetchReadiness(): Promise<ReadinessCheck> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<ReadinessCheck>("/readyz");
      return data;
    },
    mockReadiness
  );
}
