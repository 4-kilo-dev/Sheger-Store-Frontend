import { createFileRoute } from "@tanstack/react-router";
import { SkDashboard } from "@/features/dashboards/pages/SkDashboardPage";

export const Route = createFileRoute("/dashboards/sk")({
  component: SkDashboard
});
