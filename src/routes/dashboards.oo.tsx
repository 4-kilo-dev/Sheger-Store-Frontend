import { createFileRoute } from "@tanstack/react-router";
import { OoDashboard } from "@/features/dashboards/pages/OoDashboardPage";

export const Route = createFileRoute("/dashboards/oo")({
  component: OoDashboard
});
