"use client";

import { AppShell } from "@/components/layout/AppShell";
import { HealthCheckCard } from "@/components/health/HealthCheckCard";
import { useHealthCheck, useReadiness } from "@/hooks/useHealth";
import { useLiveMetrics } from "@/hooks/useMetrics";
import { useLatestAIAnalysis } from "@/hooks/useAIInsights";
import { StatCard } from "@/components/ui/StatCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, timeAgo, getStatusColor } from "@/lib/utils";
import {
  Activity,
  Server,
  Database,
  Timer,
  Cpu,
  Bot,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function HealthPage() {
  const {
    data: healthCheck,
    isLoading: healthLoading,
    isError: healthError,
    refetch: refetchHealth,
  } = useHealthCheck();

  const {
    data: readiness,
    isLoading: readinessLoading,
    isError: readinessError,
    refetch: refetchReadiness,
  } = useReadiness();

  const {
    data: live,
    isLoading: metricsLoading,
  } = useLiveMetrics();

  const {
    data: aiAnalysis,
    isLoading: aiLoading,
  } = useLatestAIAnalysis();

  const isLoading = healthLoading || readinessLoading;
  const isError = healthError && readinessError;

  return (
    <AppShell title="System Health">
      <div className="space-y-6">
        {/* Summary bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            <p className="text-sm text-gray-400">
              {readiness?.status === "ready"
                ? "All systems operational"
                : readiness?.status === "not ready"
                ? "Some systems have issues"
                : "Checking system status..."}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => {
              refetchHealth();
              refetchReadiness();
            }}
          >
            Refresh
          </Button>
        </div>

        {/* Health status cards */}
        <HealthCheckCard
          healthCheck={healthCheck}
          readiness={readiness}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => {
            refetchHealth();
            refetchReadiness();
          }}
        />

        {/* Detailed status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* API Info */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-gray-200">API Server</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={cn("font-medium", getStatusColor(healthCheck?.status === "ok"))}>
                  {healthCheck?.status ?? "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service</span>
                <span className="text-gray-300">{healthCheck?.service ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduler</span>
                <span className={cn("font-medium", getStatusColor(readiness?.scheduler_running ?? false))}>
                  {readiness?.scheduler_running ? "Running" : "Stopped"}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* DB Info */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-gray-200">Database</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={cn("font-medium", getStatusColor(readiness?.status === "ready"))}>
                  {readiness?.status === "ready" ? "Connected" : "Issues Detected"}
                </span>
              </div>
              {readiness?.last_metric_age_seconds !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Metric</span>
                  <span className="text-gray-300">
                    {readiness.last_metric_age_seconds.toFixed(1)}s ago
                  </span>
                </div>
              )}
              {live && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Snapshot Count</span>
                  <span className="text-gray-300">
                    {live.cpu_count > 0 ? "Receiving data" : "No data"}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* AI Info */}
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-gray-200">Gemini AI</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={cn(
                  "font-medium",
                  aiAnalysis?.severity !== "none" ? "text-amber-400" : getStatusColor(!aiLoading)
                )}>
                  {aiLoading ? "Checking..." : aiAnalysis ? "Connected" : "Unavailable"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Analysis</span>
                <span className="text-gray-300">
                  {aiAnalysis?.summary ? "Recently" : "Never"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Anomalies</span>
                <span className={cn(
                  "font-medium",
                  aiAnalysis?.anomaly_detected ? "text-amber-400" : "text-emerald-400"
                )}>
                  {aiAnalysis?.anomaly_detected ? "Detected" : "None"}
                </span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Issues list */}
        {readiness?.issues && readiness.issues.length > 0 && (
          <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">
                Issues ({readiness.issues.length})
              </h3>
            </div>
            <ul className="space-y-2">
              {readiness.issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10"
                >
                  <span className="text-sm text-red-300">{issue}</span>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {/* All Clear */}
        {readiness?.status === "ready" && (!readiness?.issues || readiness.issues.length === 0) && (
          <GlassCard className="p-5 bg-emerald-500/5 border-emerald-500/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-300">
                All systems operational. Everything looks good.
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
