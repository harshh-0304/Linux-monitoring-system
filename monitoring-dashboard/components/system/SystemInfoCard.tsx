"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { SystemInfo } from "@/types/system";
import { Server, Cpu, Clock, Terminal, ShieldCheck } from "lucide-react";

interface SystemInfoCardProps {
  info: SystemInfo | null;
  loading?: boolean;
}

export function SystemInfoCard({ info, loading }: SystemInfoCardProps) {
  if (loading || !info) {
    return (
      <GlassCard className="p-5 animate-pulse">
        <div className="h-6 w-36 bg-slate-800 rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-slate-800/60 rounded" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const uptimeHours = (info.uptime_seconds / 3600).toFixed(1);

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-400" />
          <h3 className="font-semibold text-slate-200">{info.hostname}</h3>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            {info.architecture}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          <span>Host Online</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">Operating System</span>
          <span className="font-medium text-slate-200">{info.os_name} ({info.kernel})</span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Processor Topology</span>
          <span className="font-medium text-slate-200">
            {info.cpu_count_physical} Physical / {info.cpu_count_logical} Logical Cores
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">Total System Memory</span>
          <span className="font-medium text-slate-200">
            {(info.total_ram_mb / 1024).toFixed(1)} GB RAM
          </span>
        </div>
        <div>
          <span className="text-slate-400 block mb-0.5">System Uptime</span>
          <span className="font-medium text-slate-200 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {uptimeHours} hrs
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
