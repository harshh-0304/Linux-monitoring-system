import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "./DashboardPage";

export default function Home() {
  return (
    <AppShell title="Dashboard">
      <DashboardPage />
    </AppShell>
  );
}
