"use client";

import { AlertCircle, RotateCcw, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";

/** Shared error UI for route error.tsx boundaries - distinguishes "backend unreachable" from other failures. */
export function ApiErrorState({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) {
  const unreachable = error instanceof ApiError && error.isUnreachable;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Alert variant="destructive" className="max-w-md">
        {unreachable ? (
          <WifiOff className="size-4" />
        ) : (
          <AlertCircle className="size-4" />
        )}
        <AlertTitle>
          {unreachable ? "Can't reach the backend" : "Something went wrong"}
        </AlertTitle>
        <AlertDescription>
          <p>{error.message || "An unexpected error occurred."}</p>
          {reset && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={reset}
            >
              <RotateCcw className="size-4" />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
