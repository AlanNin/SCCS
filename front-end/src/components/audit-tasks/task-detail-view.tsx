"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, PackageX, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiskBadge } from "@/components/bins/risk-badge";
import { auditTaskDetailOptions } from "@/lib/api/audit-tasks";
import { formatDateTime } from "@/lib/format";
import { CountForm } from "./count-form";

export function TaskDetailView({ taskId }: { taskId: number }) {
  const {
    data: task,
    isPending,
    isError,
    error,
  } = useQuery(auditTaskDetailOptions(taskId));

  if (isPending) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto w-full max-w-lg">
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load this task</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-2xl font-bold tracking-tight">
              {task.bin.code}
            </p>
            <p className="text-sm text-muted-foreground">
              Aisle {task.bin.aisle.code} · Rack {task.bin.rack.code}
              {task.plan && <> · via {task.plan.name}</>}
            </p>
          </div>
          <Badge
            variant={task.status === "DONE" ? "secondary" : "outline"}
            className="shrink-0 capitalize"
          >
            {task.status.toLocaleLowerCase()}
          </Badge>
        </div>
        <RiskBadge
          band={task.band}
          score={task.riskScoreAtCreation}
          className="w-fit"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList
              className="size-4 text-muted-foreground"
              aria-hidden
            />
            Expected pallets
            {task.expectedQuantity != null && (
              <span className="font-normal text-muted-foreground">
                · {task.expectedQuantity} units total
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {task.bin.pallets.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <PackageX className="size-4" aria-hidden />
              No pallets recorded in this bin.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {task.bin.pallets.map((pallet) => (
                <li key={pallet.id}>
                  <p className="mb-1 font-mono text-xs text-muted-foreground">
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
              <div className="w-full h-[0.5px] bg-muted-foreground/25" />

              <li className="flex items-center justify-between text-sm">
                <span className="truncate pr-2">Total</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  ×
                  {task.bin.pallets.reduce(
                    (sum, pallet) =>
                      sum +
                      pallet.items.reduce(
                        (itemSum, item) => itemSum + item.quantity,
                        0,
                      ),
                    0,
                  )}
                </span>
              </li>
            </ul>
          )}
        </CardContent>
      </Card>

      {task.status === "PENDING" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              Enter your count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CountForm task={task} />
          </CardContent>
        </Card>
      ) : (
        <Card
          className={
            task.result === "PASS"
              ? "border border-status-good/30 bg-status-good/5"
              : "border border-status-critical/30 bg-status-critical/5"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              {task.result === "PASS" ? (
                <CheckCircle2 className="size-4.5 text-status-good" />
              ) : (
                <XCircle className="size-4.5 text-status-critical" />
              )}
              Audit result:{" "}
              <span className="capitalize -ml-1">
                {task.result?.toLocaleLowerCase()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Counted quantity</span>
              <span className="font-mono font-medium">
                {task.countedQuantity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span>{formatDateTime(task.completedAt)}</span>
            </div>
            {task.notes && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-muted-foreground">Notes</p>
                  <p>{task.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
