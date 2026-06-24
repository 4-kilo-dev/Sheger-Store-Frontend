import { createFileRoute } from "@tanstack/react-router";
import { DashboardsPortal } from "@/features/dashboards/pages/DashboardsPortalPage";

export const Route = createFileRoute("/dashboards/")({
  component: DashboardsPortal
});
