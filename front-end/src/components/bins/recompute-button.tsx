"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recomputeScores } from "@/lib/api/scoring";
import { binKeys } from "@/lib/api/bins";
import { ApiError } from "@/lib/api/client";

export function RecomputeButton() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: recomputeScores,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: binKeys.all });
      toast.success(`Recomputed ${result.updatedBins} bin score(s)`);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Recompute failed",
      );
    },
  });

  return (
    <Button
      variant="outline"
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="max-sm:flex-1 gap-x-2"
    >
      {mutation.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <RefreshCw className="size-4" />
      )}
      Recompute scores
    </Button>
  );
}
