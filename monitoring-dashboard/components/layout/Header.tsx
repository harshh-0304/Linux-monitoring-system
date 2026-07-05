"use client";
// Top navigation header

import { Menu, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-canvas)] border-b border-[#ebebeb]">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-[6px] text-[var(--color-mute)] hover:text-[var(--color-ink)] hover:bg-[#f2f2f2] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={
              <RefreshCw
                className={cn("h-4 w-4", refreshing && "animate-spin")}
              />
            }
            onClick={handleRefresh}
            disabled={refreshing}
          >
            Refresh
          </Button>

          <GlassCard className="flex items-center gap-2 px-3 py-1.5">
            <Server className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </GlassCard>
        </div>
      </div>
    </header>
  );
}
