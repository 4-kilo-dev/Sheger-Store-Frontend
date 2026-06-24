import { createFileRoute } from "@tanstack/react-router";
import { BookingDetail } from "@/features/bookings/pages/BookingDetailPage";

export const Route = createFileRoute("/bookings/$code")({
  component: BookingDetail
});
