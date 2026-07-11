import { Building2, MapPin, Calendar, Wrench } from "lucide-react";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { StatusStepper } from "@/components/status-stepper";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import type { Booking } from "@/features/bookings/services/bookings.api";

interface BookingHeaderProps {
  booking: Booking;
}

export function BookingHeader({ booking }: BookingHeaderProps) {
  const { formatDate } = useDateFormatter();

  return (
    <div
      className="mb-4 rounded-lg border p-5"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-tight" style={{ color: "var(--accent)" }}>
              {booking.code}
            </h1>
            <StatusBadge status={booking.status} size="lg" />
            <PaymentBadge status={booking.payment} />
          </div>
          <div
            className="mt-2 flex items-center gap-4 text-[13px]"
            style={{ color: "var(--text-2)" }}
          >
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {booking.client}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {booking.venue}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(booking.eventDate)}
            </span>
          </div>
          {booking.ctoNotes && (
            <div
              className="mt-2 flex items-start gap-1.5 rounded-md border p-2 text-[11px]"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-2)",
                color: "var(--text-2)",
              }}
            >
              <Wrench className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--accent)" }} />
              <span>
                <strong>CTO Note:</strong> {booking.ctoNotes}
              </span>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="label-eyebrow">Total Contract Value</div>
          <div className="mt-1 font-mono text-[24px] font-bold">
            ETB {booking.amount.toLocaleString()}
          </div>
        </div>
      </div>
      <div className="mt-6">
        <StatusStepper current={booking.status} />
      </div>
    </div>
  );
}
