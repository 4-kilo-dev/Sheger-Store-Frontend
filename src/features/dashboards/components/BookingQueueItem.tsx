import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/status-badge";
import type { Booking } from "@/features/bookings/services/bookings.api";

interface BookingQueueItemProps {
  booking: Booking;
}

export function BookingQueueItem({ booking }: BookingQueueItemProps) {
  return (
    <Link
      to="/bookings/$code"
      params={{ code: booking.code }}
      className="flex items-center justify-between border-b py-3 text-[12px] transition hover:bg-[var(--surface-2)] px-4 last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{booking.code}</span>
        <span className="font-medium">{booking.client}</span>
        <span style={{ color: "var(--text-3)" }}>·</span>
        <span style={{ color: "var(--text-2)" }}>{booking.venue}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-data text-[11px]" style={{ color: "var(--text-2)" }}>{booking.eventDate}</span>
        <StatusBadge status={booking.status} />
      </div>
    </Link>
  );
}
