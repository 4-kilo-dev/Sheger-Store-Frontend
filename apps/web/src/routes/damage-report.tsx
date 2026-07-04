import { createFileRoute } from "@tanstack/react-router";
import { DamageReportPage } from "@/features/damage-reports/pages/DamageReportPage";

export const Route = createFileRoute("/damage-report")({
  component: DamageReportPage
});
