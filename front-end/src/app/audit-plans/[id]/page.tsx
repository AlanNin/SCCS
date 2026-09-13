import { notFound } from "next/navigation";
import { getAuditPlan, auditPlanKeys } from "@/lib/api/audit-plans";
import { ApiError } from "@/lib/api/client";
import { Hydrate } from "@/lib/hydration";
import { PlanDetail } from "@/components/audit-plans/plan-detail";

export const dynamic = "force-dynamic";

export default async function AuditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const planId = Number(id);
  if (!Number.isInteger(planId)) notFound();

  let plan;
  try {
    plan = await getAuditPlan(planId);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) notFound();
    throw err;
  }

  return (
    <Hydrate queryKey={auditPlanKeys.detail(planId)} data={plan}>
      <PlanDetail planId={planId} />
    </Hydrate>
  );
}
