"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricChart } from "@/components/metrics/MetricChart";
import { TimeRangeSelector } from "@/components/metrics/TimeRangeSelector";
import { useMetricsHistory, useMetricsStats } from "@/hooks/useMetrics";
import { StatCard } from "@/components/ui/StatCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { ErrorState } from "@/components/ui/ErrorState";
import { Cpu, MemoryStick, HardDrive, Activity, Gauge } from "lucide-react";
import { formatBytesPerSec, formatNumber } from "@/lib/utils";

export default function MetricsPage() {
  const [timeRange, setTimeRange] = useState(1);
  const [limit, setLimit] = useState(100);

  const { data: history, isLoading, isError, refetch } = useMetricsHistory({
    hours: timeRange,
    limit,
  });

  const { data: stats } = useMetricsStats({ hours: timeRange });

  return (
    <AppShell title="Metrics">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Limit:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Avg CPU"
              value={`${stats.avg_cpu_percent.toFixed(1)}%`}
              subtitle={`Max: ${stats.max_cpu_percent.toFixed(1)}%`}
              icon={Cpu}
              color="text-blue-400"
            />
            <StatCard
              title="Avg RAM"
              value={`${stats.avg_ram_percent.toFixed(1)}%`}
              subtitle={`Max: ${stats.max_ram_percent.toFixed(1)}%`}
              icon={MemoryStick}
              color="text-purple-400"
            />
            <StatCard
              title="Avg Disk"
              value={`${stats.avg_disk_percent.toFixed(1)}%`}
              icon={HardDrive}
              color="text-emerald-400"
            />
            <StatCard
              title="Snapshots"
              value={formatNumber(stats.snapshot_count)}
              subtitle={`Over ${stats.period_hours}h`}
              icon={Activity}
              color="text-cyan-400"
            />
          </div>
        )}

        {/* Charts */}
        {isError ? (
          <ErrorState
            title="Failed to load metric history"
            message="Could not fetch metrics from the backend."
            onRetry={() => refetch()}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MetricChart
              title="CPU Usage"
              data={history}
              isLoading={isLoading}
              isError={false}
              dataKey="cpu_percent"
              color="#3b82f6"
              gradientId="cpuGradient"
              yAxisLabel="CPU %"
            />
            <MetricChart
              title="RAM Usage"
              data={history}
              isLoading={isLoading}
              isError={false}
              dataKey="ram_percent"
              color="#8b5cf6"
              gradientId="ramGradient"
              yAxisLabel="RAM %"
            />
            <MetricChart
              title="Disk Usage"
              data={history}
              isLoading={isLoading}
              isError={false}
              dataKey="disk_percent"
              color="#10b981"
              gradientId="diskGradient"
              yAxisLabel="Disk %"
            />
            <MetricChart
              title="Network I/O"
              data={history}
              isLoading={isLoading}
              isError={false}
              dataKey="net_bytes_sent"
              color="#06b6d4"
              gradientId="netGradient"
              unit=" B/s"
              yAxisLabel="Bytes/s"
            />
          </div>
        )}

        {/* Load average chart */}
        {history && history.length > 0 && (
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              Load Average
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-gray-500 mb-1">1 Minute</p>
                <p className="text-2xl font-bold text-blue-400">
                  {history[history.length - 1]?.load_avg_1?.toFixed(2) ?? "N/A"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-gray-500 mb-1">5 Minutes</p>
                <p className="text-2xl font-bold text-purple-400">
                  {history[history.length - 1]?.load_avg_5?.toFixed(2) ?? "N/A"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs text-gray-500 mb-1">15 Minutes</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {history[history.length - 1]?.load_avg_15?.toFixed(2) ?? "N/A"}
                </p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
