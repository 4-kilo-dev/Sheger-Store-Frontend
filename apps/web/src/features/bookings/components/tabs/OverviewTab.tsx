import type { Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";
import { OVERVIEW_MAIN_SECTIONS } from "@/features/bookings/components/overview/registry";
import { OverviewSidebar } from "@/features/bookings/components/overview/OverviewSidebar";

export function OverviewTab({
  b,
  code,
  caps,
}: {
  b: Booking;
  code: string;
  caps: BookingCapabilities;
}) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12 md:col-span-8 space-y-4">
        {OVERVIEW_MAIN_SECTIONS.filter((s) => s.when(caps, b)).map((s) => (
          <s.Component key={s.id} b={b} code={code} caps={caps} />
        ))}
      </div>
      <div className="col-span-12 md:col-span-4 space-y-4">
        <OverviewSidebar b={b} caps={caps} />
      </div>
    </div>
  );
}
