import apiClient, { apiCall } from "./api";
import type { Alert, AlertQueryParams, TestAlertResult } from "@/types/alerts";
import { mockAlerts } from "@/lib/mock-data";

// ── GET /alerts — Alert history ──
export async function fetchAlerts(
  params?: AlertQueryParams
): Promise<Alert[]> {
  return apiCall(
    async () => {
      const { data } = await apiClient.get<Alert[]>("/alerts", {
        params: {
          hours: params?.hours ?? 24,
          ...(params?.severity ? { severity: params.severity } : {}),
        },
      });
      return data;
    },
    () => mockAlerts(params?.hours ?? 24, params?.severity)
  );
}

// ── POST /alerts/test — Send test Telegram alert ──
export async function sendTestAlert(): Promise<TestAlertResult> {
  return apiCall(
    async () => {
      const { data } = await apiClient.post<TestAlertResult>("/alerts/test");
      return data;
    },
    () => ({
      status: "sent",
      message: "Test alert delivered to Telegram",
    })
  );
}
