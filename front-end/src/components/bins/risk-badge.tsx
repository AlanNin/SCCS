import { cn } from "@/lib/utils";
import { RISK_BAND_META } from "@/lib/risk-band";
import type { RiskBand } from "@/types/api";

export function RiskBadge({
  band,
  score,
  className,
}: {
  band: RiskBand;
  score: number;
  className?: string;
}) {
  const meta = RISK_BAND_META[band];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        meta.bg,
        meta.fg,
        className,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden strokeWidth={2.2} />
      {meta.label} - {score}
    </span>
  );
}
