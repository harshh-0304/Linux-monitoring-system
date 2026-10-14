"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { ProcessInfo } from "@/types/system";
import { Activity, ArrowUpDown } from "lucide-react";

interface ProcessMonitorTableProps {
  processes: ProcessInfo[];
  sortBy: "cpu" | "memory";
  onSortChange: (sort: "cpu" | "memory") => void;
  loading?: boolean;
}

export function ProcessMonitorTable({
  processes,
  sortBy,
  onSortChange,
  loading,
}: ProcessMonitorTableProps) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-slate-200">Active Processes</h3>
          <span className="text-xs text-slate-500">({processes.length} top tasks)</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onSortChange("cpu")}
            className={`px-2.5 py-1 rounded transition-colors ${
              sortBy === "cpu"
                ? "bg-cyan-500/20 text-cyan-300 font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sort by CPU
          </button>
          <button
            onClick={() => onSortChange("memory")}
            className={`px-2.5 py-1 rounded transition-colors ${
              sortBy === "memory"
                ? "bg-cyan-500/20 text-cyan-300 font-medium"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sort by RAM
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-2.5 font-medium">PID</th>
              <th className="pb-2.5 font-medium">Process Name</th>
              <th className="pb-2.5 font-medium">User</th>
              <th className="pb-2.5 font-medium">CPU %</th>
              <th className="pb-2.5 font-medium">Memory %</th>
              <th className="pb-2.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="py-3">
                    <div className="h-4 bg-slate-800 rounded w-full" />
                  </td>
                </tr>
              ))
            ) : processes.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  No process data available.
                </td>
              </tr>
            ) : (
              processes.map((proc) => (
                <tr key={proc.pid} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 font-mono text-slate-400">{proc.pid}</td>
                  <td className="py-2.5 font-medium text-slate-200" title={proc.cmdline ?? proc.name}>
                    {proc.name}
                  </td>
                  <td className="py-2.5 text-slate-400">{proc.username ?? "system"}</td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${Math.min(100, proc.cpu_percent)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-300">{proc.cpu_percent.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400 rounded-full"
                          style={{ width: `${Math.min(100, proc.memory_percent)}%` }}
                        />
                      </div>
                      <span className="font-mono text-slate-300">{proc.memory_percent.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {proc.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
