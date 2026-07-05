"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/utils";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Bot,
  Timer,
  Cpu,
} from "lucide-react";

interface HealthItemProps {
  label: string;
  status: "healthy" | "unhealthy" | "unknown";
  value?: string;
  icon: React.ReactNode;
}

function HealthItem({ label, status, value, icon }: HealthItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-lg",
            status === "healthy"
              ? "bg-emerald-500/10 text-emerald-400"
              : status === "unhealthy"
              ? "bg-red-500/10 text-red-400"
              : "bg-gray-500/10 text-gray-400"
          )}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-200">{label}</p>
          {value && <p className="text-xs text-gray-500">{value}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === "healthy" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        ) : status === "unhealthy" ? (
          <XCircle className="h-4 w-4 text-red-400" />
        ) : (
          <RefreshCw className="h-4 w-4 text-gray-500 animate-pulse" />
        )}
        <span
          className={cn(
            "text-xs font-medium",
            status === "healthy"
              ? "text-emerald-400"
              : status === "unhealthy"
              ? "text-red-400"
              : "text-gray-500"
          )}
        >
          {status === "healthy"
            ? "Healthy"
            : status === "unhealthy"
            ? "Unhealthy"
            : "Unknown"}
        </span>
      </div>
    </div>
  );
}

interface HealthCheckCardProps {
  healthCheck:
    | {
        status: string;
        service: string;
      }
    | undefined;
  readiness:
    | {
        status: string;
        scheduler_running?: boolean;
        last_metric_age_seconds?: number;
        issues?: string[];
      }
    | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

export function HealthCheckCard({
  healthCheck,
  readiness,
  isLoading,
  isError,
  onRetry,
}: HealthCheckCardProps) {
  if (isLoading) {
    return (
      <GlassCard className="p-5">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (isError) {
    return (
      <GlassCard className="p-5">
        <ErrorState
          title="Failed to check system health"
          message="Could not connect to the backend."
          onRetry={onRetry}
        />
      </GlassCard>
    );
  }

  const isApiHealthy = healthCheck?.status === "ok";
  const isSchedulerHealthy = readiness?.scheduler_running ?? false;
  const isMetricFresh =
    readiness?.last_metric_age_seconds !== undefined &&
    readiness.last_metric_age_seconds < 180;
  const isReady = readiness?.status === "ready";

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-gray-200">System Health</h3>
        {readiness?.issues && readiness.issues.length > 0 && (
          <span className="text-xs text-red-400 ml-auto">
            {readiness.issues.length} issue{readiness.issues.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <HealthItem
          label="API Server"
          status={isApiHealthy ? "healthy" : "unhealthy"}
          value={healthCheck?.service ?? "Linux Server Monitor"}
          icon={<Server className="h-4 w-4" />}
        />

        <HealthItem
          label="Database"
          status={isReady ? "healthy" : isApiHealthy ? "unhealthy" : "unknown"}
          value={
            isReady
              ? "Connected"
              : readiness?.issues?.find((i) => i.includes("metric"))
              ? "Stale data"
              : "Unknown"
          }
          icon={<Database className="h-4 w-4" />}
        />

        <HealthItem
          label="Scheduler"
          status={isSchedulerHealthy ? "healthy" : "unhealthy"}
          value={
            isSchedulerHealthy
              ? "Running"
              : "Not running"
          }
          icon={<Timer className="h-4 w-4" />}
        />

        <HealthItem
          label="Metrics Collection"
          status={isMetricFresh ? "healthy" : "unhealthy"}
          value={
            readiness?.last_metric_age_seconds !== undefined
              ? `${readiness.last_metric_age_seconds.toFixed(1)}s ago`
              : "No data"
          }
          icon={<Cpu className="h-4 w-4" />}
        />

        <HealthItem
          label="Gemini AI"
          status="unknown"
          value="Requires manual check"
          icon={<Bot className="h-4 w-4" />}
        />
      </div>
    </GlassCard>
  );
}
