import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";

export function RecentBookingsWidget() {
  const { data: bookingsList = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const recent = useMemo(() => bookingsList.slice(0, 6), [bookingsList]);

  if (isLoading) {
    return (
      <div className="rounded-lg border p-5 flex flex-col justify-center items-center h-48 animate-pulse" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="text-[12px]" style={{ color: "var(--text-3)" }}>Loading bookings list...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-bold uppercase tracking-wider" style={{ color: "var(--text-1)" }}>
          <FileText className="h-4 w-4" style={{ color: "var(--accent)" }} />
          Recent Bookings
        </h2>
        <Button variant="link" size="default" asChild className="h-auto p-0">
          <Link to="/bookings" className="flex items-center gap-1">
            All bookings <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[12px]">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)", color: "var(--text-3)" }}>
              <th className="py-2.5 font-bold uppercase tracking-wider">Code</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Client</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Event Date</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Venue</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Status</th>
              <th className="py-2.5 font-bold uppercase tracking-wider">Payment</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((b) => (
              <tr key={b.code} className="border-b last:border-0 hover:bg-[var(--surface-2)] transition" style={{ borderColor: "var(--border)" }}>
                <td className="py-3 font-data font-bold">
                  <Link to="/bookings/$code" params={{ code: b.code }} style={{ color: "var(--accent)" }} className="hover:underline">
                    {b.code}
                  </Link>
                </td>
                <td className="py-3 font-medium" style={{ color: "var(--text-1)" }}>{b.client}</td>
                <td className="py-3 font-data" style={{ color: "var(--text-2)" }}>{b.eventDate}</td>
                <td className="py-3" style={{ color: "var(--text-2)" }}>{b.venue}</td>
                <td className="py-3">
                  <StatusBadge status={b.status} />
                </td>
                <td className="py-3">
                  <PaymentBadge status={b.payment} />
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center" style={{ color: "var(--text-3)" }}>
                  No bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export default RecentBookingsWidget;
