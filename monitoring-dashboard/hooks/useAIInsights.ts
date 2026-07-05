"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { triggerAIAnalysis } from "@/services/ai";

// ── Key factory ──
export const aiKeys = {
  latest: ["ai", "latest"] as const,
};

// ── Latest AI analysis ──
export function useLatestAIAnalysis() {
  return useQuery({
    queryKey: aiKeys.latest,
    queryFn: triggerAIAnalysis,
    // AI analysis is expensive — refresh less often
    refetchInterval: 300_000, // 5 minutes
    staleTime: 300_000 - 10_000,
    retry: 1,
  });
}

// ── Trigger AI analysis manually ──
export function useTriggerAIAnalysis() {
  return useMutation({
    mutationFn: triggerAIAnalysis,
  });
}
