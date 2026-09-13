import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { AuditStatus, AuditTaskDetail, AuditTaskListItem, SubmitCountInput } from "@/types/api";

export const auditTaskKeys = {
  all: ["audit-tasks"] as const,
  lists: () => [...auditTaskKeys.all, "list"] as const,
  list: (status?: AuditStatus) => [...auditTaskKeys.lists(), status ?? "ALL"] as const,
  detail: (id: number) => [...auditTaskKeys.all, "detail", id] as const,
  byBin: (binId: number) => [...auditTaskKeys.all, "by-bin", binId] as const,
};

export function getAuditTasks(status?: AuditStatus): Promise<AuditTaskListItem[]> {
  const search = status ? `?status=${status}` : "";
  return apiFetch<AuditTaskListItem[]>(`/audit-tasks${search}`);
}

export function getAuditTask(id: number): Promise<AuditTaskDetail> {
  return apiFetch<AuditTaskDetail>(`/audit-tasks/${id}`);
}

export function getOrCreateTaskForBin(binId: number): Promise<AuditTaskDetail> {
  return apiFetch<AuditTaskDetail>(`/audit-tasks/by-bin/${binId}`);
}

export function submitCount(id: number, input: SubmitCountInput): Promise<AuditTaskDetail> {
  return apiFetch<AuditTaskDetail>(`/audit-tasks/${id}/count`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export const auditTasksListOptions = (status?: AuditStatus) =>
  queryOptions({
    queryKey: auditTaskKeys.list(status),
    queryFn: () => getAuditTasks(status),
  });

export const auditTaskDetailOptions = (id: number) =>
  queryOptions({
    queryKey: auditTaskKeys.detail(id),
    queryFn: () => getAuditTask(id),
  });
