// ── AIAnalysis — returned by POST /ai/analyze ──
export interface AIAnalysis {
  anomaly_detected: boolean;
  severity: AISeverity;
  summary: string;
  analysis: string;
  recommended_action: string;
  raw_response: string;
}

export type AISeverity = "none" | "warning" | "critical";
