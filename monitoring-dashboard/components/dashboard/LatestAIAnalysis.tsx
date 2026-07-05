"use client";

import { useLatestAIAnalysis, useTriggerAIAnalysis } from "@/hooks/useAIInsights";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { Button } from "@/components/ui/Button";
import {
  Brain,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function LatestAIAnalysis() {
  const { data: analysis, isLoading, isError, refetch } = useLatestAIAnalysis();
  const triggerMutation = useTriggerAIAnalysis();

  const severityColor =
    analysis?.severity === "critical"
      ? "text-red-400"
      : analysis?.severity === "warning"
      ? "text-amber-400"
      : "text-emerald-400";

  const bgColor =
    analysis?.severity === "critical"
      ? "bg-red-500/10 border-red-500/20"
      : analysis?.severity === "warning"
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-emerald-500/10 border-emerald-500/20";

  const Icon =
    analysis?.severity === "critical"
      ? AlertTriangle
      : analysis?.severity === "warning"
      ? AlertTriangle
      : ShieldCheck;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">AI Analysis</h3>
          <Sparkles className="h-3 w-3 text-purple-400/60" />
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className={cn("h-3.5 w-3.5", triggerMutation.isPending && "animate-spin")} />}
            onClick={() => triggerMutation.mutateAsync()}
            disabled={triggerMutation.isPending}
          >
            Analyze Now
          </Button>
          <Link href="/ai-insights">
            <Button variant="ghost" size="sm" icon={<Sparkles className="h-3.5 w-3.5" />}>
              Details
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : isError ? (
        <ErrorState
          title="AI analysis unavailable"
          message="Could not reach Gemini API. Check your API key."
          onRetry={() => refetch()}
        />
      ) : analysis ? (
        <div className={cn("rounded-lg p-4 border", bgColor)}>
          <div className="flex items-start gap-3">
            <Icon className={cn("h-5 w-5 mt-0.5", severityColor)} />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    analysis.severity === "critical"
                      ? "critical"
                      : analysis.severity === "warning"
                      ? "warning"
                      : "success"
                  }
                >
                  {analysis.severity.toUpperCase()}
                </Badge>
                {analysis.anomaly_detected && (
                  <span className="text-xs text-amber-400">Anomaly Detected</span>
                )}
              </div>
              <p className="text-sm text-gray-200 font-medium">
                {analysis.summary}
              </p>
              {analysis.analysis && (
                <p className="text-xs text-gray-400 leading-relaxed">
                  {analysis.analysis}
                </p>
              )}
              {analysis.recommended_action && (
                <div className="pt-1">
                  <p className="text-xs font-medium text-gray-500 mb-0.5">
                    Recommended Action:
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    {analysis.recommended_action}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </GlassCard>
  );
}
