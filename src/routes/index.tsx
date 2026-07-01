import { createFileRoute } from "@tanstack/react-router";
import { UnifiedDashboardPage } from "@/features/dashboards/pages/UnifiedDashboardPage";

export const Route = createFileRoute("/")({
  component: UnifiedDashboardPage
});
