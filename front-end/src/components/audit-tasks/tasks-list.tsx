"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ListChecks, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { RiskBadge } from "@/components/bins/risk-badge";
import { auditTasksListOptions } from "@/lib/api/audit-tasks";
import { formatDateTime } from "@/lib/format";
import type { AuditStatus } from "@/types/api";

const TABS = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "DONE", label: "Done" },
] as const;

export function TasksList({ initialStatus }: { initialStatus?: AuditStatus }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const status =
    (searchParams.get("status") as AuditStatus | null) ?? initialStatus;

  const {
    data: tasks,
    isError,
    error,
  } = useQuery(auditTasksListOptions(status ?? undefined));

  function onTabChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "ALL") params.delete("status");
    else params.set("status", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit tasks"
        description={`${tasks?.length ?? 0} task${tasks?.length === 1 ? "" : "s"}`}
      />

      <Tabs value={status ?? "ALL"} onValueChange={onTabChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-4">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load tasks</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {tasks?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ListChecks className="size-6" aria-hidden />
            </span>
            <p className="text-sm text-muted-foreground">No tasks here.</p>
          </CardContent>
        </Card>
      )}

      <ul className="flex flex-col gap-2.5">
        {tasks?.map((task) => (
          <li key={task.id}>
            <Card className="py-0">
              <CardContent className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">
                    {task.bin.code}
                  </span>
                  <RiskBadge
                    band={task.band}
                    score={task.riskScoreAtCreation}
                  />
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
                  {task.plan && (
                    <span className="text-xs text-muted-foreground">
                      via {task.plan.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-muted-foreground">
                    {task.status === "DONE"
                      ? `Completed ${formatDateTime(task.completedAt)}`
                      : `Created ${formatDateTime(task.createdAt)}`}
                  </span>
                  <Button
                    asChild
                    size="sm"
                    variant={task.status === "PENDING" ? "default" : "ghost"}
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
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
