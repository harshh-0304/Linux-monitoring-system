"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  title: string;
  children: React.ReactNode;
}

export function AppShell({ title, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-body)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
