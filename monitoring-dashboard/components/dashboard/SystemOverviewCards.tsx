"use client";

import { useLiveMetrics, useMetricsStats } from "@/hooks/useMetrics";
import { StatCard } from "@/components/ui/StatCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { MetricGauge } from "@/components/ui/MetricGauge";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Activity,
  Gauge,
} from "lucide-react";
import { formatBytesPerSec, timeAgo, formatNumber } from "@/lib/utils";
import { METRIC_CONFIG } from "@/lib/constants";

export function SystemOverviewCards() {
  const {
    data: live,
    isLoading: liveLoading,
    isError: liveError,
    refetch: refetchLive,
  } = useLiveMetrics();

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useMetricsStats({ hours: 24 });

  if (liveError && statsError) {
    return (
      <ErrorState
        title="Failed to load metrics"
        message="Could not fetch system metrics. Is the backend running?"
        onRetry={() => {
          refetchLive();
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CPU */}
      <StatCard
        title="CPU Usage"
        value={live ? `${live.cpu_percent.toFixed(1)}%` : "—"}
        subtitle={
          live
            ? `Load: ${live.load_avg_1?.toFixed(2) ?? "N/A"} | ${live.cpu_count} cores`
            : "Loading..."
        }
        icon={Cpu}
        loading={liveLoading}
        color="text-blue-400"
        trend={
          stats
            ? {
                value: live
                  ? ((live.cpu_percent - stats.avg_cpu_percent) / stats.avg_cpu_percent) * 100
                  : 0,
                positive: live ? live.cpu_percent < stats.avg_cpu_percent : true,
              }
            : undefined
        }
      />

      {/* RAM */}
      <StatCard
        title="RAM Usage"
        value={live ? `${live.ram_percent.toFixed(1)}%` : "—"}
        subtitle={
          live
            ? `${(live.ram_used_mb / 1024).toFixed(1)} / ${(live.ram_total_mb / 1024).toFixed(1)} GB`
            : "Loading..."
        }
        icon={MemoryStick}
        loading={liveLoading}
        color="text-purple-400"
        trend={
          stats
            ? {
                value: live
                  ? ((live.ram_percent - stats.avg_ram_percent) / stats.avg_ram_percent) * 100
                  : 0,
                positive: live ? live.ram_percent < stats.avg_ram_percent : true,
              }
            : undefined
        }
      />

      {/* Disk */}
      <StatCard
        title="Disk Usage"
        value={live ? `${live.disk_percent.toFixed(1)}%` : "—"}
        subtitle={
          live
            ? `${live.disk_used_gb.toFixed(1)} / ${live.disk_total_gb.toFixed(1)} GB`
            : "Loading..."
        }
        icon={HardDrive}
        loading={liveLoading}
        color="text-emerald-400"
        trend={
          stats
            ? {
                value: live
                  ? ((live.disk_percent - stats.avg_disk_percent) / stats.avg_disk_percent) * 100
                  : 0,
                positive: live ? live.disk_percent < stats.avg_disk_percent : true,
              }
            : undefined
        }
      />

      {/* Stats summary */}
      <StatCard
        title="24h Peak / Avg"
        value={stats ? `${stats.max_cpu_percent.toFixed(1)}% / ${stats.avg_cpu_percent.toFixed(1)}%` : "—"}
        subtitle={stats ? `${formatNumber(stats.snapshot_count)} snapshots collected` : "Loading..."}
        icon={Gauge}
        loading={statsLoading}
        color="text-cyan-400"
      />

      {/* Metric gauges row */}
      <GlassCard className="col-span-full p-5">
        {liveLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <CardSkeleton />
              </div>
            ))}
          </div>
        ) : live ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricGauge
              label="CPU"
              value={live.cpu_percent}
              warningThreshold={METRIC_CONFIG.cpu.thresholds.warning}
              criticalThreshold={METRIC_CONFIG.cpu.thresholds.critical}
              color={
                live.cpu_percent >= METRIC_CONFIG.cpu.thresholds.critical
                  ? "text-red-400"
                  : live.cpu_percent >= METRIC_CONFIG.cpu.thresholds.warning
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
              size="md"
            />
            <MetricGauge
              label="RAM"
              value={live.ram_percent}
              warningThreshold={METRIC_CONFIG.ram.thresholds.warning}
              criticalThreshold={METRIC_CONFIG.ram.thresholds.critical}
              color={
                live.ram_percent >= METRIC_CONFIG.ram.thresholds.critical
                  ? "text-red-400"
                  : live.ram_percent >= METRIC_CONFIG.ram.thresholds.warning
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
              size="md"
            />
            <MetricGauge
              label="Disk"
              value={live.disk_percent}
              warningThreshold={METRIC_CONFIG.disk.thresholds.warning}
              criticalThreshold={METRIC_CONFIG.disk.thresholds.critical}
              color={
                live.disk_percent >= METRIC_CONFIG.disk.thresholds.critical
                  ? "text-red-400"
                  : live.disk_percent >= METRIC_CONFIG.disk.thresholds.warning
                  ? "text-amber-400"
                  : "text-emerald-400"
              }
              size="md"
            />
          </div>
        ) : (
          <ErrorState title="No metric data available" message="Waiting for the first collection cycle." />
        )}
      </GlassCard>

      {/* Network and Load details */}
      {live && (
        <GlassCard className="col-span-full p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Network Sent</p>
              <p className="text-lg font-semibold text-gray-200">
                {formatBytesPerSec(live.net_bytes_sent)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Network Received</p>
              <p className="text-lg font-semibold text-gray-200">
                {formatBytesPerSec(live.net_bytes_recv)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Load Average (1m / 5m / 15m)</p>
              <p className="text-lg font-semibold text-gray-200">
                {live.load_avg_1?.toFixed(2) ?? "N/A"} /{" "}
                {live.load_avg_5?.toFixed(2) ?? "N/A"} /{" "}
                {live.load_avg_15?.toFixed(2) ?? "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</p>
              <p className="text-lg font-semibold text-gray-200">
                {timeAgo(live.timestamp)}
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
