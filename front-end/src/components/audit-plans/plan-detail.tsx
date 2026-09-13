"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ClipboardX, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { RiskBadge } from "@/components/bins/risk-badge";
import { auditPlanDetailOptions } from "@/lib/api/audit-plans";
import { formatDateTime } from "@/lib/format";

export function PlanDetail({ planId }: { planId: number }) {
  const {
    data: plan,
    isPending,
    isError,
    error,
  } = useQuery(auditPlanDetailOptions(planId));

  if (isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load this plan</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={plan.name}
        description={`Created ${formatDateTime(plan.createdAt)} · ${plan.tasks.length} bin(s)`}
      />

      {plan.tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ClipboardX className="size-6" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">
              This plan has no bins left to audit - they may have been removed
              since it was created.
            </p>
          </CardContent>
        </Card>
      )}

      {plan.tasks.length > 0 && (
        <>
          {/* Table on sm+, stacked cards on mobile for touch-friendly rows. */}
          <Card className="hidden overflow-hidden py-0 sm:block rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Bin</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-mono font-medium">
                      {task.bin.code}
                    </TableCell>
                    <TableCell>
                      <RiskBadge
                        band={task.band}
                        score={task.riskScoreAtCreation}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={task.status === "DONE" ? "success" : "outline"}
                        className="capitalize"
                      >
                        {task.status.toLocaleLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {task.result ? (
                        <Badge
                          variant={
                            task.result === "PASS" ? "success" : "destructive"
                          }
                          className="capitalize"
                        >
                          {task.result.toLowerCase()}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">----</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="sm"
                        variant={
                          task.status === "PENDING" ? "default" : "ghost"
                        }
                      >
                        <Link href={`/audit-tasks/${task.id}`}>
                          {task.status === "PENDING" ? (
                            <>
                              <ScanLine className="size-4" />
                              Count
                            </>
                          ) : (
                            <span className="flex gap-x-1.5 items-center">
                              View <ChevronRight />
                            </span>
                          )}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <ul className="flex flex-col gap-3 sm:hidden">
            {plan.tasks.map((task) => (
              <li key={task.id}>
                <Card className="gap-3 p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">
                      {task.bin.code}
                    </span>

                    <Badge
                      variant={task.status === "DONE" ? "success" : "outline"}
                      className="capitalize"
                    >
                      {task.status.toLocaleLowerCase()}
                    </Badge>
                    {task.result && (
                      <Badge
                        variant={
                          task.result === "PASS" ? "success" : "destructive"
                        }
                        className="capitalize"
                      >
                        {task.result.toLocaleLowerCase()}
                      </Badge>
                    )}
                    <div className="flex items-center justify-between">
                      <RiskBadge
                        band={task.band}
                        score={task.riskScoreAtCreation}
                      />
                    </div>
                  </div>

                  <Button
                    asChild
                    size="sm"
                    className="w-full"
                    variant={task.status === "PENDING" ? "default" : "outline"}
                  >
                    <Link href={`/audit-tasks/${task.id}`}>
                      {task.status === "PENDING" ? (
                        <>
                          <ScanLine className="size-4" />
                          Count this bin
                        </>
                      ) : (
                        <span className="flex gap-x-1.5 items-center">
                          View <ChevronRight />
                        </span>
                      )}
                    </Link>
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
