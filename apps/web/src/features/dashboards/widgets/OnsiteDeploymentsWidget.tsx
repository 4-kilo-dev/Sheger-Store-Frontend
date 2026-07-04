import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { MapPin, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";

export function OnsiteDeploymentsWidget() {
  const { data: bookingsList = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const onsiteBookings = useMemo(
    () => bookingsList.filter((b) => b.status === "ONSITE").slice(0, 4),
    [bookingsList]
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border p-5 flex flex-col justify-center items-center h-48 animate-pulse" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading onsite screens...</div>
      </div>
    );
  }

  if (onsiteBookings.length === 0) return null;

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4" style={{ color: "var(--color-status-accepted)" }} />
        <span className="label-eyebrow">Screens onsite now</span>
        <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in oklab, var(--color-status-accepted) 18%, transparent)", color: "var(--color-status-accepted)" }}>
          {onsiteBookings.length} active
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {onsiteBookings.map((b) => (
          <Button key={b.code} variant="outline" size="default" asChild className="h-auto text-left p-3.5 flex flex-col items-start gap-1">
            <Link to="/bookings/$code" params={{ code: b.code }} className="w-full">
              <div className="w-full">
                <div className="flex items-center justify-between">
                  <span className="font-data text-[12px] font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                  <StatusBadge status={b.status} />
                </div>
                <div className="mt-2 text-[13px] font-semibold text-[var(--text-1)]">{b.client}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
                  <MapPin className="h-3 w-3 shrink-0" /> {b.venue}
                </div>
                {b.assignees.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                    <Users className="h-3 w-3 shrink-0" /> {b.assignees.join(" · ")}
                  </div>
                )}
              </div>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
export default OnsiteDeploymentsWidget;
