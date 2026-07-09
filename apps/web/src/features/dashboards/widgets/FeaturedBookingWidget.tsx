import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { StatusStepper } from "@/components/status-stepper";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";

export function FeaturedBookingWidget() {
  const { data: bookingsList = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const featured = useMemo(() => {
    if (bookingsList.length === 0) return null;
    // Prioritize preparation and onsite bookings
    return (
      bookingsList.find((b) => b.status === "PREPARATION") ||
      bookingsList.find((b) => b.status === "ONSITE") ||
      bookingsList[0]
    );
  }, [bookingsList]);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-5 flex flex-col justify-center items-center h-48 animate-pulse" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading featured operations...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5 flex flex-col justify-between" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="mb-4">
        <span className="label-eyebrow">Active preparation</span>
      </div>
      {featured ? (
        <>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold" style={{ color: "var(--text-3)" }}>{featured.code}</div>
              <h2 className="mt-1 text-[16px] font-bold leading-tight" style={{ color: "var(--text-1)" }}>
                {featured.client} · {featured.venue}
              </h2>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={featured.status} />
              <Button variant="link" size="default" asChild className="h-auto p-0">
                <Link to="/bookings/$code" params={{ code: featured.code }}>
                  Open booking →
                </Link>
              </Button>
            </div>
          </div>
          <StatusStepper current={featured.status} />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center h-full">
          <CalendarRange className="h-8 w-8 mb-2" style={{ color: "var(--text-3)" }} />
          <div className="text-[13px] font-bold" style={{ color: "var(--text-2)" }}>No active bookings</div>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>When bookings are registered, they will show up here.</p>
        </div>
      )}
    </div>
  );
}
export default FeaturedBookingWidget;
