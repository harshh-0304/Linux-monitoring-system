"use client";

import { SystemOverviewCards } from "@/components/dashboard/SystemOverviewCards";
import { ActiveAlertsWidget } from "@/components/dashboard/ActiveAlertsWidget";
import { LatestAIAnalysis } from "@/components/dashboard/LatestAIAnalysis";
import { useLiveMetrics } from "@/hooks/useMetrics";
import { Button } from "@/components/ui/Button";
import { useTriggerCollection } from "@/hooks/useMetrics";
import { RefreshCw, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";

export function DashboardPage() {
  const { data: live, isLoading } = useLiveMetrics();
  const collectionMutation = useTriggerCollection();

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          <p className="text-sm text-gray-400">
            {live
              ? `System is being monitored — last update ${new Date(
                  live.timestamp
                ).toLocaleTimeString()}`
              : isLoading
              ? "Loading metrics..."
              : "Waiting for first metric collection..."}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={
            <RefreshCw
              className={cn(
                "h-4 w-4",
                collectionMutation.isPending && "animate-spin"
              )}
            />
          }
          onClick={() => collectionMutation.mutate()}
          disabled={collectionMutation.isPending}
        >
          Collect Now
        </Button>
      </div>

      {/* System overview cards */}
      <SystemOverviewCards />

      {/* AI Analysis + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LatestAIAnalysis />
        <ActiveAlertsWidget />
      </div>

      {/* Quick stats footer */}
      {live && (
        <GlassCard className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">CPU Cores</p>
              <p className="text-sm font-semibold text-gray-200">
                {live.cpu_count}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total RAM</p>
              <p className="text-sm font-semibold text-gray-200">
                {(live.ram_total_mb / 1024).toFixed(1)} GB
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Disk</p>
              <p className="text-sm font-semibold text-gray-200">
                {live.disk_total_gb.toFixed(0)} GB
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Load (1m)</p>
              <p className="text-sm font-semibold text-gray-200">
                {live.load_avg_1?.toFixed(2) ?? "N/A"}
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
