import { Calendar, CheckCircle2, DollarSign } from "lucide-react";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { PaymentBadge } from "@/components/status-badge";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import { getPaymentSummary, type Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";
import { useSystemCurrency } from "@/hooks/use-system-currency";

export function OverviewSidebar({
  b,
  caps,
}: {
  b: Booking;
  caps: BookingCapabilities;
}) {
  const { formatDate, formatDateTime } = useDateFormatter();
  const { formatMoney } = useSystemCurrency();

  const assemblyDisplay = b.assemblyDate || b.rentalStart;
  const dismantleDisplay = b.dismantleDate || b.rentalEnd;
  const eventMs = b.eventDate ? new Date(b.eventDate).getTime() : NaN;
  const daysToEvent = Number.isFinite(eventMs)
    ? Math.max(0, Math.ceil((eventMs - Date.now()) / 86400000))
    : null;
  const crewSize = b.assignees.length;

  return (
    <>
      <Section title="Schedule" icon={Calendar}>
        <KV label="Assembly" value={assemblyDisplay ? formatDateTime(assemblyDisplay) : "—"} mono />
        <KV label="Event" value={b.eventDate ? formatDateTime(b.eventDate) : "—"} mono />
        <KV label="Dismantle" value={dismantleDisplay ? formatDateTime(dismantleDisplay) : "—"} mono />
        {b.rentedDays != null && b.rentedDays > 0 && (
          <KV label="Number of Days" value={String(b.rentedDays)} mono />
        )}
      </Section>

      {caps.showFinancials && (() => {
        const summary = getPaymentSummary(b);
        return (
          <Section title="Financial" icon={DollarSign}>
            {b.dailyRate != null && b.dailyRate > 0 && (
              <KV label="Daily Rate" value={formatMoney(b.dailyRate)} mono />
            )}
            <KV label="Paid" value={formatMoney(summary.paid)} mono />
            <KV
              label="Total"
              value={summary.total === null ? "—" : formatMoney(summary.total)}
              mono
            />
            <KV
              label="Balance"
              value={summary.remaining === null ? "Pending" : formatMoney(summary.remaining)}
              mono
            />
            <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
              <KV label="Status" value={<PaymentBadge status={b.payment} />} />
            </div>
          </Section>
        );
      })()}

      <Section title="Quick Stats" icon={CheckCircle2}>
        <KV label="Days to Event" value={daysToEvent !== null ? daysToEvent : "—"} mono />
        <KV label="Crew Size" value={crewSize > 0 ? crewSize : "—"} mono />
        <KV label="BOM Items" value={b.bomItems.length} mono />
        <KV label="Created" value={b.createdAt ? formatDate(b.createdAt) : "—"} mono />
      </Section>
    </>
  );
}
