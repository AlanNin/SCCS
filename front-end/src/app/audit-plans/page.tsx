import { getAuditPlans, auditPlanKeys } from "@/lib/api/audit-plans";
import { Hydrate } from "@/lib/hydration";
import { PlansList } from "@/components/audit-plans/plans-list";

export const dynamic = "force-dynamic";

export default async function AuditPlansPage() {
  const plans = await getAuditPlans();

  return (
    <Hydrate queryKey={auditPlanKeys.lists()} data={plans}>
      <PlansList />
    </Hydrate>
  );
}
