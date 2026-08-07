import { createFileRoute } from "@tanstack/react-router";
import { DamageReportPage } from "@/features/damage-reports/pages/DamageReportPage";

export const Route = createFileRoute("/damage-report")({
  head: () => ({
    meta: [
      { title: "Damage Report · Vortex Visual" },
      { name: "description", content: "Log damaged rental equipment for warehouse inspection and repair." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    poolId: typeof search.poolId === "string" ? search.poolId : undefined,
    itemId: typeof search.itemId === "string" ? search.itemId : undefined,
    booking: typeof search.booking === "string" ? search.booking : undefined,
  }),
  component: DamageReportPage,
});
