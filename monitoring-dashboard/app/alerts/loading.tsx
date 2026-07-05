import { AppShell } from "@/components/layout/AppShell";
import { CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function AlertsLoading() {
  return (
    <AppShell title="Alerts">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <TableSkeleton rows={8} />
      </div>
    </AppShell>
  );
}
