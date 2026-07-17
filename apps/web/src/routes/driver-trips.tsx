import { createFileRoute } from "@tanstack/react-router";
import { DriverTripsPage } from "@/features/driver-trips/pages/DriverTripsPage";

export const Route = createFileRoute("/driver-trips")({
  component: DriverTripsPage,
});
