"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  Brain,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Lightbulb,
  RefreshCw,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIAnalysis } from "@/types/ai";

interface AnalysisCardProps {
  analysis: AIAnalysis | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  onAnalyzeNow?: () => void;
  isAnalyzing?: boolean;
}

export function AnalysisCard({
  analysis,
  isLoading,
  isError,
  onRetry,
  onAnalyzeNow,
  isAnalyzing,
}: AnalysisCardProps) {
  if (isLoading) {
    return (
      <GlassCard className="p-5">
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </GlassCard>
    );
  }

  if (isError) {
    return (
      <GlassCard className="p-5">
        <ErrorState
          title="AI analysis unavailable"
          message="Could not connect to Gemini API. Check GOOGLE_API_KEY."
          onRetry={onRetry}
        />
      </GlassCard>
    );
  }

  if (!analysis) {
    return (
      <GlassCard className="p-5">
        <EmptyState
          icon={<Brain className="h-8 w-8" />}
          title="No analysis yet"
          description="AI analysis runs automatically every 5 minutes. Click below to trigger one now."
          action={
            onAnalyzeNow && (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="h-4 w-4" />}
                onClick={onAnalyzeNow}
                loading={isAnalyzing}
              >
                Analyze Now
              </Button>
            )
          }
        />
      </GlassCard>
    );
  }

  const isHealthy = !analysis.anomaly_detected || analysis.severity === "none";

  return (
    <GlassCard
      className={cn(
        "p-5 border-l-4",
        analysis.severity === "critical"
          ? "border-l-red-500"
          : analysis.severity === "warning"
          ? "border-l-amber-500"
          : "border-l-emerald-500"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-2 rounded-lg",
              isHealthy ? "bg-emerald-500/10" : "bg-amber-500/10"
            )}
          >
            {isHealthy ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">
              {analysis.severity === "none"
                ? "System Healthy"
                : "Anomaly Detected"}
            </h3>
            <p className="text-xs text-gray-500">
              Gemini AI Analysis
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              analysis.severity === "critical"
                ? "critical"
                : analysis.severity === "warning"
                ? "warning"
                : "success"
            }
            size="md"
          >
            {analysis.severity.toUpperCase()}
          </Badge>
          {onAnalyzeNow && (
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className={cn("h-3.5 w-3.5", isAnalyzing && "animate-spin")} />}
              onClick={onAnalyzeNow}
              disabled={isAnalyzing}
            />
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-200 font-medium">{analysis.summary}</p>
      </div>

      {/* Detailed Analysis */}
      {analysis.analysis && (
        <div className="mb-4 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-2">
            <History className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Trend Analysis</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            {analysis.analysis}
          </p>
        </div>
      )}

      {/* Recommended Action */}
      {analysis.recommended_action && (
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-1.5 mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">
              Recommended Action
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono">
            {analysis.recommended_action}
          </p>
        </div>
      )}
    </GlassCard>
  );
}
