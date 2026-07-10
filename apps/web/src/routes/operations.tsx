import { createFileRoute } from "@tanstack/react-router";
import { OperationsPage } from "@/features/bookings/pages/OperationsPage";

export const Route = createFileRoute("/operations")({
  component: OperationsPage,
});
