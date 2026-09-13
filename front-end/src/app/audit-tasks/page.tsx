import { getAuditTasks, auditTaskKeys } from "@/lib/api/audit-tasks";
import { Hydrate } from "@/lib/hydration";
import { TasksList } from "@/components/audit-tasks/tasks-list";
import type { AuditStatus } from "@/types/api";

export const dynamic = "force-dynamic";

function parseStatus(value: string | undefined): AuditStatus | undefined {
  return value === "PENDING" || value === "DONE" ? value : undefined;
}

export default async function AuditTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = parseStatus(rawStatus);
  const tasks = await getAuditTasks(status);

  return (
    <Hydrate queryKey={auditTaskKeys.list(status)} data={tasks}>
      <TasksList initialStatus={status} />
    </Hydrate>
  );
}
