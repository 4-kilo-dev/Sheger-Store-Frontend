import type { ComponentType } from "react";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";

export type OverviewSectionProps = {
  b: Booking;
  code: string;
  caps: BookingCapabilities;
};

export type OverviewSectionDef = {
  id: string;
  Component: ComponentType<OverviewSectionProps>;
  when: (caps: BookingCapabilities, b: Booking) => boolean;
};
