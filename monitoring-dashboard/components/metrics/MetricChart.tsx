"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChartSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { MetricSnapshot } from "@/types/metrics";

interface MetricChartProps {
  title: string;
  data: MetricSnapshot[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  dataKey: keyof MetricSnapshot;
  color?: string;
  gradientId?: string;
  unit?: string;
  height?: number;
  yAxisLabel?: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  unit: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[6px] border border-[#ebebeb] bg-white px-3 py-2 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      <p className="text-xs text-[#8f8f8f] uppercase font-mono tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-[#171717]">
        {payload[0].value.toFixed(1)}
        {unit}
      </p>
    </div>
  );
};

export function MetricChart({
  title,
  data,
  isLoading,
  isError,
  onRetry,
  dataKey,
  color = "#3b82f6",
  gradientId = "gradient",
  unit = "%",
  height = 300,
  yAxisLabel,
}: MetricChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Data decimation: max 100 points
    const MAX_POINTS = 100;
    const step = Math.max(1, Math.ceil(data.length / MAX_POINTS));
    
    return data
      .filter((_, i) => i % step === 0)
      .map((d) => ({
        time: new Date(d.timestamp).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: d[dataKey] as number,
      }))
      .reverse();
  }, [data, dataKey]);

  if (isLoading) {
    return <ChartSkeleton height={`h-[${height}px]`} />;
  }

  if (isError) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-[#171717] mb-4">{title}</h3>
        <ErrorState
          title="Failed to load chart data"
          onRetry={onRetry}
        />
      </GlassCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold text-[#171717] mb-4">{title}</h3>
        <EmptyState
          title="No data available"
          description="Waiting for metrics to be collected."
        />
      </GlassCard>
    );
  }

  const values = chartData.map((d) => d.value);
  const minVal = Math.floor(Math.min(...values) * 0.95);
  const maxVal = Math.ceil(Math.max(...values) * 1.05);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#171717]">{title}</h3>
        {yAxisLabel && (
          <span className="text-xs text-[#8f8f8f] font-mono">{yAxisLabel}</span>
        )}
      </div>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                <stop offset="100%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(0,0,0,0.04)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fill: "#8f8f8f", fontSize: 11 }}
              axisLine={{ stroke: "rgba(0,0,0,0.06)" }}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              domain={[minVal, maxVal]}
              tick={{ fill: "#8f8f8f", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip content={<CustomTooltip unit={unit} />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}
