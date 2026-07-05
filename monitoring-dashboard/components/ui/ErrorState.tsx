"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this data.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <div className="mb-4 p-3 rounded-full bg-red-500/10 text-red-400">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
