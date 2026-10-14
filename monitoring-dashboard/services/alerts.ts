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

// ── PATCH /alerts/{id}/resolve — Mark alert as resolved ──
export async function resolveAlert(alertId: number): Promise<Alert> {
  return apiCall(
    async () => {
      const { data } = await apiClient.patch<Alert>(`/alerts/${alertId}/resolve`);
      return data;
    },
    () => ({
      id: alertId,
      timestamp: new Date().toISOString(),
      alert_type: "cpu_high",
      severity: "warning",
      message: "Alert resolved",
      ai_analysis: null,
      telegram_sent: "sent",
      is_resolved: true,
      resolved_at: new Date().toISOString(),
    })
  );
}

// ── GET /alerts/stats — Alert triage statistics ──
export async function fetchAlertStats(hours = 24) {
  return apiCall(
    async () => {
      const { data } = await apiClient.get(`/alerts/stats`, { params: { hours } });
      return data;
    },
    () => ({
      total_alerts: 0,
      open_alerts: 0,
      resolved_alerts: 0,
      critical_alerts: 0,
      warning_alerts: 0,
      alert_types_breakdown: {},
      period_hours: hours,
    })
  );
}

