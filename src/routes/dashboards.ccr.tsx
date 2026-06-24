import { createFileRoute } from "@tanstack/react-router";
import { CcrDashboard } from "@/features/dashboards/pages/CcrDashboardPage";

export const Route = createFileRoute("/dashboards/ccr")({
  component: CcrDashboard
});
