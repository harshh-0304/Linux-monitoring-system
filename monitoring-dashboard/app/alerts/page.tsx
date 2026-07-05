"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AlertTable } from "@/components/alerts/AlertTable";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { useAlerts, useSendTestAlert } from "@/hooks/useAlerts";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Send, Bell, AlertTriangle, BellOff } from "lucide-react";
import type { AlertSeverity } from "@/types/alerts";

export default function AlertsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">(
    "all"
  );

  const { data: alerts, isLoading, isError, refetch } = useAlerts({
    hours: 24,
    ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
  });

  const testAlertMutation = useSendTestAlert();

  const criticalCount =
    alerts?.filter((a) => a.severity === "critical").length ?? 0;
  const warningCount =
    alerts?.filter((a) => a.severity === "warning").length ?? 0;
  const sentCount =
    alerts?.filter((a) => a.telegram_sent === "sent").length ?? 0;

  return (
    <AppShell title="Alerts">
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Alerts (24h)"
            value={alerts?.length ?? "—"}
            icon={Bell}
            loading={isLoading}
          />
          <StatCard
            title="Critical"
            value={criticalCount}
            icon={AlertTriangle}
            color="text-red-400"
            loading={isLoading}
          />
          <StatCard
            title="Warnings"
            value={warningCount}
            icon={AlertTriangle}
            color="text-amber-400"
            loading={isLoading}
          />
          <StatCard
            title="Telegram Sent"
            value={sentCount}
            icon={BellOff}
            color="text-emerald-400"
            loading={isLoading}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <AlertFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            severityFilter={severityFilter}
            onSeverityChange={setSeverityFilter}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Send className="h-4 w-4" />}
            onClick={() => testAlertMutation.mutate()}
            loading={testAlertMutation.isPending}
          >
            Test Telegram
          </Button>
        </div>

        {/* Table */}
        <AlertTable
          alerts={alerts}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          searchQuery={searchQuery}
        />
      </div>
    </AppShell>
  );
}
