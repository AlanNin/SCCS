"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAuditPlan, auditPlanKeys } from "@/lib/api/audit-plans";
import { ApiError } from "@/lib/api/client";

export function CreatePlanDialog() {
  const [open, setOpen] = useState(false);
  const [topN, setTopN] = useState("10");
  const [name, setName] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      createAuditPlan({ topN: Number(topN), name: name.trim() || undefined }),
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: auditPlanKeys.lists() });
      toast.success(`Created "${plan.name}" with ${plan.tasks.length} task(s)`);
      setOpen(false);
      setName("");
      router.push(`/audit-plans/${plan.id}`);
    },
    onError: (error) => {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to create plan",
      );
    },
  });

  const topNValue = Number(topN);
  const isValid =
    Number.isInteger(topNValue) && topNValue >= 1 && topNValue <= 100;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="max-sm:flex-1 gap-x-2">
          <ClipboardPlus className="size-4" />
          Generate audit plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isValid) mutation.mutate();
          }}
        >
          <DialogHeader>
            <span className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ClipboardPlus className="size-5" aria-hidden />
            </span>
            <DialogTitle>Generate audit plan</DialogTitle>
            <DialogDescription>
              Creates a task for each of the top N riskiest bins right now.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="topN">Number of bins</Label>
              <Input
                id="topN"
                type="number"
                min={1}
                max={100}
                inputMode="numeric"
                value={topN}
                onChange={(e) => setTopN(e.target.value)}
                required
              />
              {!isValid && (
                <p className="text-xs text-destructive">
                  Enter a number between 1 and 100.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="planName">Plan name (optional)</Label>
              <Input
                id="planName"
                placeholder={`Top ${topN || "N"} risk audit`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!isValid || mutation.isPending}>
              {mutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Create plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
