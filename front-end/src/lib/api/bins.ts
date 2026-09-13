import { queryOptions } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type { BinDetail, BinSearchResult, BinSummary } from "@/types/api";

export const binKeys = {
  all: ["bins"] as const,
  lists: () => [...binKeys.all, "list"] as const,
  detail: (id: number) => [...binKeys.all, "detail", id] as const,
  search: (q: string) => [...binKeys.all, "search", q] as const,
};

export function getBins(): Promise<BinSummary[]> {
  return apiFetch<BinSummary[]>("/bins");
}

export function getBin(id: number): Promise<BinDetail> {
  return apiFetch<BinDetail>(`/bins/${id}`);
}

export function searchBins(q: string): Promise<BinSearchResult[]> {
  return apiFetch<BinSearchResult[]>(`/bins/search?q=${encodeURIComponent(q)}`);
}

export const binsListOptions = () =>
  queryOptions({
    queryKey: binKeys.lists(),
    queryFn: getBins,
  });

export const binDetailOptions = (id: number) =>
  queryOptions({
    queryKey: binKeys.detail(id),
    queryFn: () => getBin(id),
  });

export const binSearchOptions = (q: string) =>
  queryOptions({
    queryKey: binKeys.search(q),
    queryFn: () => searchBins(q),
    enabled: q.trim().length > 0,
  });
