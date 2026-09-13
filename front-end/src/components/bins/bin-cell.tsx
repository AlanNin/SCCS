"use client";

import { cn } from "@/lib/utils";
import { RISK_BAND_META } from "@/lib/risk-band";
import type { BinSummary } from "@/types/api";

export function BinCell({
  bin,
  onSelect,
}: {
  bin: BinSummary;
  onSelect: (id: number) => void;
}) {
  const meta = RISK_BAND_META[bin.band];
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(bin.id)}
      className={cn(
        "group flex p-2 items-center justify-center gap-4 rounded-sm transition-all border border-primary/15",
        "hover:-translate-y-0.5 hover:shadow-md focus-visible:-translate-y-0.5 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        meta.bg,
        meta.fg,
        meta.ring,
      )}
      aria-label={`Bin ${bin.code}, ${meta.label}, score ${bin.riskScore}`}
    >
      <div className="flex flex-col gap-y-0.5 text-start">
        <span className="text-[10px] opacity-80">Risk:</span>
        <span className="capitalize text-xs flex items-center gap-x-1">
          <Icon className="size-3" aria-hidden /> {bin.riskScore}
        </span>{" "}
      </div>

      <div className="flex flex-col gap-y-0.5 text-start">
        <span className="text-[10px] opacity-80">Code:</span>
        <span className="text-xs font-medium whitespace-nowrap">
          {bin.code}
        </span>
      </div>
    </button>
  );
}
