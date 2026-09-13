"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  Boxes,
  Clock,
  Gauge,
  PackageSearch,
  ShelvingUnit,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { binsListOptions } from "@/lib/api/bins";
import { formatDate, formatDateTime } from "@/lib/format";
import { RISK_BAND_META } from "@/lib/risk-band";
import type { BinSummary, RiskBand } from "@/types/api";
import { BinCell } from "./bin-cell";
import { BinDetailSheet } from "./bin-detail-sheet";
import { RecomputeButton } from "./recompute-button";
import { CreatePlanDialog } from "@/components/audit-plans/create-plan-dialog";
import { cn } from "cn";

interface RackGroup {
  id: number;
  code: string;
  bins: BinSummary[];
}
interface AisleGroup {
  id: number;
  code: string;
  racks: RackGroup[];
}

function groupByAisleAndRack(bins: BinSummary[]): AisleGroup[] {
  const aisles = new Map<number, AisleGroup>();

  for (const bin of bins) {
    let aisle = aisles.get(bin.aisle.id);
    if (!aisle) {
      aisle = { id: bin.aisle.id, code: bin.aisle.code, racks: [] };
      aisles.set(bin.aisle.id, aisle);
    }
    let rack = aisle.racks.find((r) => r.id === bin.rack.id);
    if (!rack) {
      rack = { id: bin.rack.id, code: bin.rack.code, bins: [] };
      aisle.racks.push(rack);
    }
    rack.bins.push(bin);
  }

  return [...aisles.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {(Object.keys(RISK_BAND_META) as RiskBand[]).map((band) => {
        const meta = RISK_BAND_META[band];
        const Icon = meta.icon;
        return (
          <span key={band} className="flex items-center gap-1.5">
            <Icon
              className={cn("size-3.5 -mt-0.5", meta.color)}
              aria-hidden
              strokeWidth={2.5}
            />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

export function HeatmapDashboard() {
  const { data: bins, isError, error } = useQuery(binsListOptions());
  const [selectedBinId, setSelectedBinId] = useState<number | null>(null);
  const aisles = useMemo(() => groupByAisleAndRack(bins ?? []), [bins]);

  const stats = useMemo(() => {
    const list = bins ?? [];
    const highRisk = list.filter((b) => b.band === "high").length;
    const avgScore = list.length
      ? Math.round(list.reduce((sum, b) => sum + b.riskScore, 0) / list.length)
      : 0;
    const lastScored = list.reduce<string | null>((latest, b) => {
      if (!b.lastScoredAt) return latest;
      if (!latest || b.lastScoredAt > latest) return b.lastScoredAt;
      return latest;
    }, null);
    return { total: list.length, highRisk, avgScore, lastScored };
  }, [bins]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Warehouse heatmap"
        description="Tap a bin to see its score, why it got that score, and what's stored there."
        actions={
          <>
            <RecomputeButton />
            <CreatePlanDialog />
          </>
        }
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load bins</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Bins tracked"
          value={String(stats.total)}
          icon={Boxes}
        />
        <StatCard
          label="High risk bins"
          value={String(stats.highRisk)}
          icon={AlertOctagon}
          tone={stats.highRisk > 0 ? "critical" : "default"}
        />
        <StatCard
          label="Average score"
          value={String(stats.avgScore)}
          icon={Gauge}
          className="max-sm:col-span-2"
        />
        <StatCard
          label="Scores last computed"
          value={stats.lastScored ? formatDateTime(stats.lastScored) : "Never"}
          icon={Clock}
          className="col-span-2"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
        <Legend />
        <p className="text-xs text-muted-foreground">Grouped by aisle → rack</p>
      </div>

      {aisles.length === 0 && (
        <Card className="rounded-md">
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
            <PackageSearch className="size-8" aria-hidden strokeWidth={1.4} />
            No bins yet. Seed the warehouse from the backend to get started.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {aisles.map((aisle) => (
          <Card key={aisle.id} className="gap-4 py-4 rounded-md">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="flex py-1.5 px-3 items-center justify-center rounded-sm bg-primary/10 text-xs text-primary">
                  Aisle {aisle.code}
                </span>
                <span className="flex py-1.5 px-3 items-center justify-center rounded-sm text-xs bg-muted-foreground/10 text-muted-foreground">
                  Contains: {aisle.racks.length} Racks &{" "}
                  {aisle.racks.reduce((sum, rack) => sum + rack.bins.length, 0)}{" "}
                  Bins
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-4">
              {aisle.racks.map((rack) => (
                <div
                  key={rack.id}
                  className="flex max-sm:flex-col sm:items-center gap-x-4 gap-y-2 w-full"
                >
                  <aside className="flex flex-col justify-center gap-y-1">
                    <article className="flex gap-x-1.5 items-center">
                      <ShelvingUnit className="size-3" />
                      <p className="text-xs whitespace-nowrap font-medium">
                        Rack {rack.code}
                      </p>
                    </article>
                    <p className="text-xs whitespace-nowrap font-medium text-muted-foreground">
                      Bins: {rack.bins.length}
                    </p>
                  </aside>
                  <aside className="w-full grid grid-cols-[repeat(auto-fill,minmax(124px,1fr))] gap-2 ">
                    {/* <aside className="w-full flex gap-2"> */}
                    {rack.bins.map((bin) => (
                      <BinCell
                        key={bin.id}
                        bin={bin}
                        onSelect={setSelectedBinId}
                      />
                    ))}
                  </aside>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <BinDetailSheet
        binId={selectedBinId}
        onOpenChange={(open) => !open && setSelectedBinId(null)}
      />
    </div>
  );
}
