"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { auditTaskKeys, submitCount } from "@/lib/api/audit-tasks";
import { binKeys } from "@/lib/api/bins";
import { auditPlanKeys } from "@/lib/api/audit-plans";
import { ApiError } from "@/lib/api/client";
import type { AuditResult, AuditTaskDetail } from "@/types/api";

export function CountForm({ task }: { task: AuditTaskDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [countedQuantity, setCountedQuantity] = useState(
    task.expectedQuantity != null ? String(task.expectedQuantity) : "",
  );
  const [result, setResult] = useState<AuditResult | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitCount(task.id, {
        countedQuantity: Number(countedQuantity),
        result: result!,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(auditTaskKeys.detail(task.id), updated);
      queryClient.invalidateQueries({ queryKey: auditTaskKeys.lists() });
      queryClient.invalidateQueries({ queryKey: binKeys.all });
      queryClient.invalidateQueries({ queryKey: auditPlanKeys.all });
      toast.success(`Count saved - ${updated.result} - scores recomputed`);
      router.refresh();
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to save count",
      );
    },
  });

  const quantity = Number(countedQuantity);
  const isValid =
    countedQuantity !== "" &&
    Number.isInteger(quantity) &&
    quantity >= 0 &&
    !!result;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValid) mutation.mutate();
      }}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-2">
        <Label htmlFor="countedQuantity">Quantity counted</Label>
        <Input
          id="countedQuantity"
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          className="h-14 text-center text-2xl font-semibold"
          value={countedQuantity}
          onChange={(e) => setCountedQuantity(e.target.value)}
          required
        />
        {task.expectedQuantity != null && (
          <p className="text-center text-xs text-muted-foreground">
            Expected: {task.expectedQuantity}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>Result</Label>
        <ToggleGroup
          type="single"
          value={result}
          onValueChange={(value) =>
            setResult(value ? (value as AuditResult) : undefined)
          }
          variant="outline"
          className="grid grid-cols-2 gap-3"
        >
          <ToggleGroupItem
            value="PASS"
            className={cn(
              "h-11 gap-2 text-base font-medium",
              "data-[state=on]:bg-status-good data-[state=on]:text-status-good-foreground",
            )}
          >
            <CheckCircle2 className="size-5" />
            Pass
          </ToggleGroupItem>
          <ToggleGroupItem
            value="FAIL"
            className={cn(
              "h-11 gap-2 text-base font-medium",
              "data-[state=on]:bg-status-critical data-[state=on]:text-status-critical-foreground",
            )}
          >
            <XCircle className="size-5" />
            Fail
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. short by 2 units, damaged pallet…"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={!isValid || mutation.isPending}
        className="h-12 text-base"
      >
        {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
        Submit count
      </Button>
    </form>
  );
}
