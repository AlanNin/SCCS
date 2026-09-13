import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { AuditPlanDetail, AuditPlanSummary, CreateAuditPlanInput } from "@/types/api";

export const auditPlanKeys = {
  all: ["audit-plans"] as const,
  lists: () => [...auditPlanKeys.all, "list"] as const,
  detail: (id: number) => [...auditPlanKeys.all, "detail", id] as const,
};

export function getAuditPlans(): Promise<AuditPlanSummary[]> {
  return apiFetch<AuditPlanSummary[]>("/audit-plans");
}

export function getAuditPlan(id: number): Promise<AuditPlanDetail> {
  return apiFetch<AuditPlanDetail>(`/audit-plans/${id}`);
}

export function createAuditPlan(input: CreateAuditPlanInput): Promise<AuditPlanDetail> {
  return apiFetch<AuditPlanDetail>("/audit-plans", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export const auditPlansListOptions = () =>
  queryOptions({
    queryKey: auditPlanKeys.lists(),
    queryFn: getAuditPlans,
  });

export const auditPlanDetailOptions = (id: number) =>
  queryOptions({
    queryKey: auditPlanKeys.detail(id),
    queryFn: () => getAuditPlan(id),
  });
