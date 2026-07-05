// ── Alert — returned by GET /alerts ──
export interface Alert {
  id: number;
  timestamp: string; // ISO 8601
  alert_type: AlertType;
  severity: AlertSeverity;
  message: string;
  ai_analysis: string | null;
  telegram_sent: TelegramStatus;
}

export type AlertType =
  | "cpu_high"
  | "cpu_critical"
  | "ram_high"
  | "ram_critical"
  | "disk_high"
  | "disk_critical"
  | "ai_anomaly"
  | "test";

export type AlertSeverity = "warning" | "critical";

export type TelegramStatus = "sent" | "suppressed" | "failed" | "pending";

// ── AlertQueryParams — used for GET /alerts ──
export interface AlertQueryParams {
  hours?: number; // 1–168, default 24
  severity?: AlertSeverity; // optional filter
}

// ── TestAlertResult — returned by POST /alerts/test ──
export interface TestAlertResult {
  status: "sent" | "failed";
  message: string;
}
