import { createFileRoute } from "@tanstack/react-router";
import { BookingsIndex } from "@/features/bookings/pages/BookingsListPage";

export const Route = createFileRoute("/bookings/")({
  component: BookingsIndex
});
