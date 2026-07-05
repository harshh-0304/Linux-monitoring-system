"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AnalysisCard } from "@/components/ai/AnalysisCard";
import { RiskScoreBadge } from "@/components/ai/RiskScoreBadge";
import { useLatestAIAnalysis, useTriggerAIAnalysis } from "@/hooks/useAIInsights";
import { useAlerts } from "@/hooks/useAlerts";
import { StatCard } from "@/components/ui/StatCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Brain, Sparkles, History, Lightbulb, Activity } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";

export default function AIInsightsPage() {
  const { data: analysis, isLoading, isError, refetch } = useLatestAIAnalysis();
  const triggerMutation = useTriggerAIAnalysis();
  const { data: aiAlerts } = useAlerts({ hours: 168 });

  const aiAlertHistory = aiAlerts?.filter(
    (a) => a.alert_type === "ai_anomaly"
  ) ?? [];

  return (
    <AppShell title="AI Insights">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            <p className="text-sm text-gray-400">
              AI-powered anomaly detection powered by Google Gemini
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="h-4 w-4" />}
            onClick={async () => {
              await triggerMutation.mutateAsync();
              refetch();
            }}
            loading={triggerMutation.isPending}
          >
            Run Analysis
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Current Risk Level"
            value={
              analysis?.severity === "none"
                ? "Low"
                : analysis?.severity === "warning"
                ? "Medium"
                : analysis?.severity === "critical"
                ? "High"
                : "—"
            }
            icon={Activity}
            color={
              analysis?.severity === "critical"
                ? "text-red-400"
                : analysis?.severity === "warning"
                ? "text-amber-400"
                : "text-emerald-400"
            }
            loading={isLoading}
          />
          <StatCard
            title="AI Anomalies (7d)"
            value={aiAlertHistory.length}
            icon={Brain}
            color="text-purple-400"
          />
          <StatCard
            title="Anomalies Detected"
            value={analysis?.anomaly_detected ? "Yes" : "No"}
            icon={Sparkles}
            color={
              analysis?.anomaly_detected ? "text-amber-400" : "text-emerald-400"
            }
            loading={isLoading}
          />
        </div>

        {/* Current analysis */}
        <AnalysisCard
          analysis={analysis}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          onAnalyzeNow={async () => {
            await triggerMutation.mutateAsync();
            refetch();
          }}
          isAnalyzing={triggerMutation.isPending}
        />

        {/* AI Alert History */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-gray-200">
              AI Alert History (7 days)
            </h3>
          </div>

          {aiAlertHistory.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="No AI alerts in the last 7 days"
              description="Your system has been running without AI-detected anomalies."
            />
          ) : (
            <div className="space-y-2">
              {aiAlertHistory.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    alert.severity === "critical"
                      ? "bg-red-500/5 border-red-500/20"
                      : "bg-amber-500/5 border-amber-500/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            alert.severity as "warning" | "critical"
                          }
                        >
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {timeAgo(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{alert.message}</p>
                      {alert.ai_analysis && (
                        <div className="mt-2 flex items-start gap-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-xs text-gray-500">
                            {alert.ai_analysis}
                          </p>
                        </div>
                      )}
                    </div>
                    <RiskScoreBadge
                      severity={alert.severity as "warning" | "critical"}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
