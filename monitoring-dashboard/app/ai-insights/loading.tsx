import { AppShell } from "@/components/layout/AppShell";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default function AIInsightsLoading() {
  return (
    <AppShell title="AI Insights">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </AppShell>
  );
}
