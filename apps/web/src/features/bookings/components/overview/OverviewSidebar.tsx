import { Calendar, CheckCircle2, DollarSign } from "lucide-react";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { PaymentBadge } from "@/components/status-badge";
import { Section } from "@/features/bookings/components/shared/Section";
import { KV } from "@/features/bookings/components/shared/KV";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";

export function OverviewSidebar({
  b,
  caps,
}: {
  b: Booking;
  caps: BookingCapabilities;
}) {
  const { formatDate } = useDateFormatter();

  return (
    <>
      <Section title="Schedule" icon={Calendar}>
        <KV label="Assembly" value={formatDate(b.assemblyDate)} mono />
        <KV label="Event" value={formatDate(b.eventDate)} mono />
        <KV label="Dismantle" value={formatDate(b.dismantleDate)} mono />
      </Section>

      {caps.showOpsSidebar && (
        <Section title="Financial" icon={DollarSign}>
          <KV label="Contract" value={`ETB ${b.amount.toLocaleString()}`} mono />
          <KV
            label="Paid"
            value={
              b.payment === "PAID"
                ? `ETB ${b.amount.toLocaleString()}`
                : b.payment === "ADVANCE"
                  ? `ETB ${(b.amount / 2).toLocaleString()}`
                  : "ETB 0"
            }
            mono
          />
          <KV
            label="Balance"
            value={b.payment === "PAID" ? "ETB 0" : `ETB ${(b.amount / 2).toLocaleString()}`}
            mono
          />
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
            <KV label="Status" value={<PaymentBadge status={b.payment} />} />
          </div>
        </Section>
      )}

      <Section title="Quick Stats" icon={CheckCircle2}>
        <KV
          label="Days to Event"
          value={Math.max(
            0,
            Math.ceil((new Date(b.eventDate).getTime() - Date.now()) / 86400000)
          )}
          mono
        />
        <KV label="Crew Size" value={b.assignees.length + 4} mono />
        <KV label="BOM Items" value={b.bomItems.length} mono />
        <KV label="Created" value={b.createdAt} mono />
      </Section>
    </>
  );
}
