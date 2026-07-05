"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ErrorState } from "@/components/ui/ErrorState";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell title="Error">
      <div className="flex items-center justify-center min-h-[60vh]">
        <ErrorState
          title="Dashboard Error"
          message={error.message || "An unexpected error occurred."}
          onRetry={reset}
        />
      </div>
    </AppShell>
  );
}
