"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, History, PackageX, ScanLine } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { binDetailOptions } from "@/lib/api/bins";
import { formatDateTime } from "@/lib/format";
import { RISK_BAND_META } from "@/lib/risk-band";
import { ScoreFactorChart } from "./score-factor-chart";

export function BinDetailSheet({
  binId,
  onOpenChange,
}: {
  binId: number | null;
  onOpenChange: (open: boolean) => void;
}) {
  const open = binId !== null;
  const { data, isPending, isError, error } = useQuery({
    ...binDetailOptions(binId ?? -1),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {isPending && open && (
          <div className="space-y-4 p-6">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t load bin</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          </div>
        )}

        {data && (
          // Plain native scroll, not Radix ScrollArea: ScrollArea's viewport
          // only sets `overflow-y: scroll` once its own resize-observer
          // decides a scrollbar is needed, which can get stuck at
          // `overflow-y: hidden` (clipped, unscrollable) inside a fixed,
          // animating panel like this one. Native overflow-y-auto has no
          // such measurement step - it just works off the box model.
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div
              className={`${RISK_BAND_META[data.band].bg} ${RISK_BAND_META[data.band].fg} px-6 pt-6 pb-5`}
            >
              <SheetHeader className="gap-1 p-0">
                <SheetTitle className="font-mono text-2xl font-bold text-current">
                  {data.code}
                </SheetTitle>
                <SheetDescription className="text-current/80">
                  {data.aisle.code} / {data.rack.code} · {data.warehouse.name}
                </SheetDescription>
              </SheetHeader>
              <p className="mt-3 text-4xl font-bold tabular-nums text-current">
                {data.riskScore}
                <span className="ml-1.5 align-middle text-sm font-medium opacity-80">
                  / 100 · {RISK_BAND_META[data.band].label}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-6 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <History className="size-3.5" aria-hidden />
                    Last audited
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(data.lastAuditedAt)}
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" aria-hidden />
                    Score computed
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(data.lastScoredAt)}
                  </p>
                </div>
              </div>

              {data.scoreFactors && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Why this score?
                  </h3>
                  <ScoreFactorChart scoreFactors={data.scoreFactors} />
                </div>
              )}

              <Separator />

              <div>
                <h3 className="mb-3 text-sm font-semibold">
                  Pallets in bin{" "}
                  <span className="text-muted-foreground">
                    ({data.pallets.length})
                  </span>
                </h3>

                {data.pallets.length === 0 ? (
                  <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <PackageX className="size-4" aria-hidden />
                    This bin is empty.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {data.pallets.map((pallet) => (
                      <li
                        key={pallet.id}
                        className="rounded-lg border bg-card p-3"
                      >
                        <p className="mb-1.5 font-mono text-xs text-muted-foreground">
                          {pallet.code}
                        </p>
                        <ul className="flex flex-col gap-1">
                          {pallet.items.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="truncate pr-2">
                                {item.product.name}
                              </span>
                              <span className="shrink-0 font-mono text-muted-foreground">
                                ×{item.quantity}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button asChild size="lg" className="mt-1">
                <Link href={`/count/${data.id}`}>
                  <ScanLine className="size-4" />
                  Audit this bin
                </Link>
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
