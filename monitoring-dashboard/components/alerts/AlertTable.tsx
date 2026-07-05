"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn, timeAgo } from "@/lib/utils";
import { SEVERITY_COLORS, TELEGRAM_STATUS_COLORS } from "@/lib/constants";
import { BellOff, Bell } from "lucide-react";
import type { Alert, AlertSeverity } from "@/types/alerts";
import { useMemo } from "react";

interface AlertTableProps {
  alerts: Alert[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  searchQuery?: string;
}

export function AlertTable({
  alerts,
  isLoading,
  isError,
  onRetry,
  searchQuery = "",
}: AlertTableProps) {
  const filteredAlerts = useMemo(() => {
    if (!alerts) return [];
    if (!searchQuery.trim()) return alerts;
    const q = searchQuery.toLowerCase();
    return alerts.filter(
      (a) =>
        a.alert_type.toLowerCase().includes(q) ||
        a.message.toLowerCase().includes(q) ||
        a.severity.toLowerCase().includes(q)
    );
  }, [alerts, searchQuery]);

  if (isLoading) {
    return <TableSkeleton rows={8} />;
  }

  if (isError) {
    return (
      <GlassCard className="p-5">
        <ErrorState
          title="Failed to load alerts"
          onRetry={onRetry}
        />
      </GlassCard>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <GlassCard className="p-5">
        <EmptyState
          icon={<BellOff className="h-8 w-8" />}
          title="No alerts"
          description="No alerts have been triggered in the selected time period."
        />
      </GlassCard>
    );
  }

  if (filteredAlerts.length === 0) {
    return (
      <GlassCard className="p-5">
        <EmptyState
          icon={<BellOff className="h-8 w-8" />}
          title="No matching alerts"
          description="No alerts match your current search or filter criteria."
        />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Severity
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Telegram
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filteredAlerts.map((alert) => {
              const colors = SEVERITY_COLORS[alert.severity as AlertSeverity] || SEVERITY_COLORS.warning;
              return (
                <tr
                  key={alert.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1 rounded-full", colors.bg)}>
                        <Bell className={cn("h-3 w-3", colors.text)} />
                      </div>
                      <span className="text-sm text-gray-300 capitalize">
                        {alert.alert_type.replace(/_/g, " ")}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={alert.severity as "warning" | "critical"}>
                      {alert.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-300 max-w-md truncate">
                      {alert.message}
                    </p>
                    {alert.ai_analysis && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">
                        AI: {alert.ai_analysis}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-medium",
                        TELEGRAM_STATUS_COLORS[alert.telegram_sent]
                      )}
                    >
                      {alert.telegram_sent}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-gray-500">
                      {timeAgo(alert.timestamp)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
