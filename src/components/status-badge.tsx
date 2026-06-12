import type { BookingStatus, PaymentStatus } from "@/lib/mock-bookings";

const STATUS_VAR: Record<BookingStatus, string> = {
  RESERVED: "var(--color-status-reserved)",
  CONFIRMED: "var(--color-status-confirmed)",
  ASSIGNED: "var(--color-status-assigned)",
  ACCEPTED: "var(--color-status-accepted)",
  PREPARATION: "var(--color-status-preparation)",
  ONSITE: "var(--color-status-onsite)",
  COMPLETED: "var(--color-status-completed)",
  DONE: "var(--color-status-done)",
};

const PAY_VAR: Record<PaymentStatus, string> = {
  PAID: "var(--color-pay-paid)",
  ADVANCE: "var(--color-pay-advance)",
  UNPAID: "var(--color-pay-unpaid)",
};

export function StatusBadge({ status, size = "sm" }: { status: BookingStatus; size?: "sm" | "lg" }) {
  const c = STATUS_VAR[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-bold uppercase tracking-wider ${
        size === "lg" ? "px-3 py-1.5 text-[12px]" : "px-2 py-0.5 text-[10px]"
      }`}
      style={{
        color: c,
        backgroundColor: `color-mix(in oklab, ${c} 14%, transparent)`,
        borderColor: `color-mix(in oklab, ${c} 38%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {status}
    </span>
  );
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const c = PAY_VAR[status];
  return (
    <span
      className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{
        color: c,
        backgroundColor: `color-mix(in oklab, ${c} 16%, transparent)`,
        borderColor: `color-mix(in oklab, ${c} 40%, transparent)`,
      }}
    >
      {status}
    </span>
  );
}
