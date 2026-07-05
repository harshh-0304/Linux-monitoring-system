import { AppShell } from "@/components/layout/AppShell";
import { ChartSkeleton, CardSkeleton } from "@/components/ui/Skeleton";

export default function MetricsLoading() {
  return (
    <AppShell title="Metrics">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
