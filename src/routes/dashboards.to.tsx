import { createFileRoute } from "@tanstack/react-router";
import { ToDashboard } from "@/features/dashboards/pages/ToDashboardPage";

export const Route = createFileRoute("/dashboards/to")({
  component: ToDashboard
});
