import { apiFetch } from "./client";
import type { RecomputeResult } from "@/types/api";

export function recomputeScores(): Promise<RecomputeResult> {
  return apiFetch<RecomputeResult>("/scoring/recompute", { method: "POST" });
}
