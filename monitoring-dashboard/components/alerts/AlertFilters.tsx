"use client";

import { Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AlertSeverity } from "@/types/alerts";

interface AlertFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  severityFilter: AlertSeverity | "all";
  onSeverityChange: (severity: AlertSeverity | "all") => void;
}

export function AlertFilters({
  searchQuery,
  onSearchChange,
  severityFilter,
  onSeverityChange,
}: AlertFiltersProps) {
  const severityOptions: { label: string; value: AlertSeverity | "all" }[] = [
    { label: "All Severities", value: "all" },
    { label: "Warning", value: "warning" },
    { label: "Critical", value: "critical" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search alerts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            "w-full rounded-lg border border-white/[0.08] bg-white/[0.04]",
            "pl-10 pr-4 py-2 text-sm text-gray-200 placeholder:text-gray-600",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40",
            "transition-all duration-200"
          )}
        />
      </div>

      {/* Severity filter */}
      <div className="flex gap-1">
        {severityOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSeverityChange(opt.value)}
            className={cn(
              "px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200",
              severityFilter === opt.value
                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.08] hover:text-gray-300"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
