"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { BinScoreFactors } from "@/types/api";
import { useIsMobile } from "@/hooks/use-media-query";

const FACTOR_LABELS: Record<keyof BinScoreFactors["factors"], string> = {
  daysSinceLastAudit: "Days since audit",
  movementFrequency: "Movement frequency",
  adjustmentFrequency: "Adjustment frequency",
  auditFailRate: "Audit fail rate",
  productDiversity: "SKU diversity",
};

const chartConfig = {
  normalized: { label: "Normalized", color: "var(--color-chart-1)" },
} satisfies ChartConfig;

// All bars share the sequential palette's default hue - these are five
// components of one score, not distinct series, so one hue is correct
// (see dataviz skill: sequential = one hue; identity here comes from the
// axis label, not color).
const BAR_COLOR = "#2a78d6";

export function ScoreFactorChart({
  scoreFactors,
}: {
  scoreFactors: BinScoreFactors;
}) {
  const isMobile = useIsMobile();
  const data = (
    Object.keys(scoreFactors.factors) as (keyof BinScoreFactors["factors"])[]
  ).map((key) => {
    const factor = scoreFactors.factors[key];
    return {
      key,
      label: `${FACTOR_LABELS[key]} (${Math.round(scoreFactors.weights[key] * 100)}%)`,
      normalized: factor.normalized,
      contribution: factor.contribution,
    };
  });

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 4, right: 28 }}
        barCategoryGap={10}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        {!isMobile && (
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span>Normalized</span>
                    <span className="font-mono font-medium">
                      {Number(value).toFixed(0)}% (+
                      {item.payload.contribution.toFixed(1)} pts)
                    </span>
                  </div>
                )}
              />
            }
          />
        )}
        <Bar dataKey="normalized" fill={BAR_COLOR} radius={4} maxBarSize={20}>
          <LabelList
            dataKey="contribution"
            position="right"
            className="fill-muted-foreground"
            fontSize={11}
            formatter={(value: unknown) => `+${Number(value ?? 0).toFixed(1)}`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
