import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/features/dashboards/pages/AdminDashboardPage";

export const Route = createFileRoute("/")({
  component: AdminDashboard
});
