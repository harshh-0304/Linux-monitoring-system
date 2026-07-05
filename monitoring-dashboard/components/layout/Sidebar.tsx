"use client";
// Sidebar layout configuration

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Brain,
  Activity,
  Monitor,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  BarChart3,
  Bell,
  Brain,
  Activity,
};

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64",
          "bg-[var(--color-canvas)] border-r border-[#ebebeb]",
          "transform transition-transform duration-300 ease-in-out",
          "lg:translate-x-0 lg:fixed lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-[#ebebeb]">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="p-1.5 rounded-[6px] bg-[#0070f3]/10">
              <Monitor className="h-5 w-5 text-[var(--color-link)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink)]">{APP_NAME}</p>
              <p className="text-[10px] text-[var(--color-mute)]">AIOps Dashboard</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="p-1 rounded-[6px] text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[#f2f2f2] lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm font-medium",
                  "transition-all duration-200",
                  isActive
                    ? "bg-[#f2f2f2] text-[var(--color-ink)] font-semibold border-transparent"
                    : "text-[var(--color-body)] hover:text-[var(--color-ink)] hover:bg-[#f2f2f2] border border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#ebebeb]">
          <p className="text-[10px] text-[var(--color-mute)] text-center">
            v{process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}
          </p>
        </div>
      </aside>
    </>
  );
}
