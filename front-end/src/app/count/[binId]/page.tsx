import { notFound, redirect } from "next/navigation";
import { getOrCreateTaskForBin } from "@/lib/api/audit-tasks";
import { ApiError } from "@/lib/api/client";

export const dynamic = "force-dynamic";

// Resolver-only route: opens (or reuses) the bin's pending task, then hands
// off to the canonical count UI at /audit-tasks/[id] so there is one count
// form, not two.
export default async function CountBinPage({ params }: { params: Promise<{ binId: string }> }) {
  const { binId } = await params;
  const id = Number(binId);
  if (!Number.isInteger(id)) notFound();

  let task;
  try {
    task = await getOrCreateTaskForBin(id);
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) notFound();
    throw err;
  }

  redirect(`/audit-tasks/${task.id}`);
}
