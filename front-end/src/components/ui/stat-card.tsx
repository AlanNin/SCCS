import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "good" | "warning" | "critical";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-md border bg-card p-4 shadow-xs",
        className,
      )}
    >
      <span
        className={cn(
          "flex p-2 shrink-0 items-center justify-center rounded-md",
          tone === "default" && "bg-primary/10 text-primary",
          tone === "good" && "bg-status-good/12 text-status-good",
          tone === "warning" && "bg-status-warning/15 text-status-warning",
          tone === "critical" && "bg-status-critical/12 text-status-critical",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col ">
        <p className="truncate text-lg font-semibold tracking-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground -mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}
