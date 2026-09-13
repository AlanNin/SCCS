"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, ClipboardList, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/page-header";
import { auditPlansListOptions } from "@/lib/api/audit-plans";
import { formatDateTime } from "@/lib/format";
import { CreatePlanDialog } from "./create-plan-dialog";

export function PlansList() {
  const { data: plans, isError, error } = useQuery(auditPlansListOptions());

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit plans"
        description={`${plans?.length ?? 0} plan${plans?.length === 1 ? "" : "s"} generated`}
        actions={<CreatePlanDialog />}
      />

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load audit plans</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {plans?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <ClipboardList className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium">No audit plans yet</p>
              <p className="text-sm text-muted-foreground">
                Generate one from the dashboard to get started.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2.5">
        {plans?.map((plan) => (
          <Link key={plan.id} href={`/audit-plans/${plan.id}`}>
            <Card className="border border-transparent py-0 transition-all hover:border-primary/40 hover:shadow-sm rounded-md">
              <CardContent className="flex items-center gap-4 px-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ClipboardList className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{plan.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    {formatDateTime(plan.createdAt)} · {plan.taskCount} bin(s)
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  {plan.pendingCount > 0 && (
                    <Badge variant="outline">{plan.pendingCount} pending</Badge>
                  )}
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="size-3" aria-hidden />
                    {plan.doneCount} done
                  </Badge>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
