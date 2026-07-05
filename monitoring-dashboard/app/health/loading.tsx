import { AppShell } from "@/components/layout/AppShell";
import { CardSkeleton } from "@/components/ui/Skeleton";

export default function HealthLoading() {
  return (
    <AppShell title="System Health">
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
