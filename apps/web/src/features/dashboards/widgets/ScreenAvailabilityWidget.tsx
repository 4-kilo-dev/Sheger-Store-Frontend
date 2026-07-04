import { useQuery } from "@tanstack/react-query";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";

export function ScreenAvailabilityWidget() {
  const { data: bookingsList = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  if (isLoading) {
    return (
      <div className="rounded-lg border p-4 animate-pulse" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading screen availability...</div>
      </div>
    );
  }

  const screenTypes = ["P2.97", "P4", "P3.91 INDOOR"];

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="label-eyebrow mb-3">Screen availability</div>
      <div className="grid gap-3 md:grid-cols-3">
        {screenTypes.map((type) => {
          const bookingsUsing = bookingsList.filter(
            (b) =>
              b.screenType === type &&
              ["RESERVED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "PREPARATION", "ONSITE"].includes(b.status)
          );
          return (
            <div key={type} className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="font-data text-[12px] font-bold" style={{ color: "var(--text-1)" }}>{type}</div>
              <div className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>
                {bookingsUsing.length} active bookings
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default ScreenAvailabilityWidget;
