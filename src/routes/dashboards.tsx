import { createFileRoute } from "@tanstack/react-router";
import { DashboardsLayout } from "@/features/dashboards/pages/DashboardsLayout";

export const Route = createFileRoute("/dashboards")({
  component: DashboardsLayout
});
