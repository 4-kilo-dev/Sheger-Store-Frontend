import { createFileRoute } from "@tanstack/react-router";
import { CtoDashboard } from "@/features/dashboards/pages/CtoDashboardPage";

export const Route = createFileRoute("/dashboards/cto")({
  component: CtoDashboard
});
