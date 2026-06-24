import { createFileRoute } from "@tanstack/react-router";
import { BookingsLayout } from "@/features/bookings/pages/BookingsLayout";

export const Route = createFileRoute("/bookings")({
  component: BookingsLayout
});
