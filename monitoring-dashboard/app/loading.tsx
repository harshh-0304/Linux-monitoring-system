import { AppShell } from "@/components/layout/AppShell";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </AppShell>
  );
}
