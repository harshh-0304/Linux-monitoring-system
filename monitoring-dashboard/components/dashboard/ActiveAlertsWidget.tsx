"use client";

import { useAlerts } from "@/hooks/useAlerts";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { BellOff, Bell, ArrowRight } from "lucide-react";
import { timeAgo, cn } from "@/lib/utils";
import { SEVERITY_COLORS, TELEGRAM_STATUS_COLORS } from "@/lib/constants";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Alert, AlertSeverity } from "@/types/alerts";

function AlertRow({ alert }: { alert: Alert }) {
  const colors = SEVERITY_COLORS[alert.severity as AlertSeverity] || SEVERITY_COLORS.warning;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors",
        "bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.04] hover:border-white/[0.08]"
      )}
    >
      <div className={cn("mt-0.5 p-1.5 rounded-full", colors.bg)}>
        <Bell className={cn("h-3.5 w-3.5", colors.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Badge variant={alert.severity as "warning" | "critical"}>
            {alert.alert_type.replace("_", " ")}
          </Badge>
          <span className={cn("text-xs", TELEGRAM_STATUS_COLORS[alert.telegram_sent] || "text-gray-500")}>
            {alert.telegram_sent}
          </span>
        </div>
        <p className="text-sm text-gray-300 truncate">{alert.message}</p>
        <p className="text-xs text-gray-500 mt-0.5">{timeAgo(alert.timestamp)}</p>
      </div>
    </div>
  );
}

export function ActiveAlertsWidget() {
  const { data: alerts, isLoading, isError, refetch } = useAlerts({
    hours: 24,
  });

  const recentAlerts = alerts?.slice(0, 5) ?? [];
  const criticalCount = alerts?.filter((a) => a.severity === "critical").length ?? 0;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Active Alerts</h3>
          {criticalCount > 0 && (
            <p className="text-xs text-red-400 mt-0.5">
              {criticalCount} critical alert{criticalCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link href="/alerts">
          <Button variant="ghost" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />}>
            View All
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load alerts"
          message="Could not fetch alert data."
          onRetry={() => refetch()}
        />
      ) : recentAlerts.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-8 w-8" />}
          title="No recent alerts"
          description="All clear — no alerts in the last 24 hours."
        />
      ) : (
        <div className="space-y-2">
          {recentAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}
