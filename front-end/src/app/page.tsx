import { getBins, binKeys } from "@/lib/api/bins";
import { Hydrate } from "@/lib/hydration";
import { HeatmapDashboard } from "@/components/bins/heatmap-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const bins = await getBins();

  return (
    <Hydrate queryKey={binKeys.lists()} data={bins}>
      <HeatmapDashboard />
    </Hydrate>
  );
}
