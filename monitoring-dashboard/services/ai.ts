import apiClient, { apiCall } from "./api";
import type { AIAnalysis } from "@/types/ai";
import { mockAIAnalysis } from "@/lib/mock-data";

// ── POST /ai/analyze — Trigger AI analysis ──
export async function triggerAIAnalysis(): Promise<AIAnalysis> {
  return apiCall(
    async () => {
      const { data } = await apiClient.post<AIAnalysis>("/ai/analyze");
      return data;
    },
    mockAIAnalysis
  );
}
