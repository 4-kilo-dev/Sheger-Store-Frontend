import { createFileRoute } from "@tanstack/react-router";
import { NewBooking } from "@/features/bookings/pages/NewBookingPage";

export const Route = createFileRoute("/bookings/new")({
  component: NewBooking
});
