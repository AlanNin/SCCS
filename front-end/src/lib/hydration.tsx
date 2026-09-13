import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

/** Seeds a fresh QueryClient with server-fetched data and hydrates it for the client cache. */
export function Hydrate<T>({
  queryKey,
  data,
  children,
}: {
  queryKey: readonly unknown[];
  data: T;
  children: ReactNode;
}) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(queryKey, data);
  return <HydrationBoundary state={dehydrate(queryClient)}>{children}</HydrationBoundary>;
}
