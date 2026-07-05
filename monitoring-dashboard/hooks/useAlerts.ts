"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlerts, sendTestAlert } from "@/services/alerts";
import { NORMAL_REFRESH_INTERVAL } from "@/lib/constants";
import type { AlertQueryParams } from "@/types/alerts";

// ── Key factory ──
export const alertsKeys = {
  list: (params: AlertQueryParams) => ["alerts", "list", params] as const,
};

// ── Alert history ──
export function useAlerts(params: AlertQueryParams = {}) {
  return useQuery({
    queryKey: alertsKeys.list(params),
    queryFn: () => fetchAlerts(params),
    refetchInterval: NORMAL_REFRESH_INTERVAL,
    staleTime: NORMAL_REFRESH_INTERVAL - 5000,
    retry: 2,
  });
}

// ── Send test alert ──
export function useSendTestAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendTestAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
