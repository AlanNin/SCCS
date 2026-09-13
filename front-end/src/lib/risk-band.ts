import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { RiskBand } from "@/types/api";

/** Presentation for each risk band: color always ships with an icon + label, never alone. */
export const RISK_BAND_META: Record<
  RiskBand,
  {
    label: string;
    icon: typeof CheckCircle2;
    bg: string;
    color: string;
    fg: string;
    ring: string;
  }
> = {
  low: {
    label: "Low risk",
    icon: CheckCircle2,
    bg: "bg-status-good",
    color: "text-status-good",
    fg: "text-status-good-foreground",
    ring: "ring-status-good/40",
  },
  medium: {
    label: "Medium risk",
    icon: AlertTriangle,
    bg: "bg-status-warning",
    color: "text-status-warning",
    fg: "text-status-warning-foreground",
    ring: "ring-status-warning/40",
  },
  high: {
    label: "High risk",
    icon: XCircle,
    bg: "bg-status-critical",
    color: "text-status-critical",
    fg: "text-status-critical-foreground",
    ring: "ring-status-critical/40",
  },
};
