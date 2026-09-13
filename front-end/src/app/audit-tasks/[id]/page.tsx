import { notFound } from "next/navigation";
import { getAuditTask, auditTaskKeys } from "@/lib/api/audit-tasks";
import { ApiError } from "@/lib/api/client";
import { Hydrate } from "@/lib/hydration";
import { TaskDetailView } from "@/components/audit-tasks/task-detail-view";

export const dynamic = "force-dynamic";

export default async function AuditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const taskId = Number(id);
  if (!Number.isInteger(taskId)) notFound();

  let task;
  try {
    task = await getAuditTask(taskId);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) notFound();
    throw err;
  }

  return (
    <Hydrate queryKey={auditTaskKeys.detail(taskId)} data={task}>
      <TaskDetailView taskId={taskId} />
    </Hydrate>
  );
}
