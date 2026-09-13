"use client";

import { useEffect } from "react";
import { ApiErrorState } from "@/components/api-error-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ApiErrorState error={error} reset={reset} />;
}
