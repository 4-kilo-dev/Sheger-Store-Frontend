import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Headphones, Phone, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { MOCK_BOOKINGS, type Booking } from "@/lib/mock-bookings";

export const Route = createFileRoute("/dashboards/ccr")({
  head: () => ({
    meta: [
      { title: "CCR Dashboard · Vortex Visual" },
      { name: "description", content: "Client Relations Operational Workspace." },
    ],
  }),
  component: CCRDashboardPage,
});

function BookingRow({ b }: { b: Booking }) {
  return (
    <Link
      to="/bookings/$code"
      params={{ code: b.code }}
      className="flex items-center justify-between border-b py-3 text-[12px] transition hover:bg-[var(--surface-2)] px-4 last:border-0"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-3">
        <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
        <span className="font-medium">{b.client}</span>
        <span style={{ color: "var(--text-3)" }}>·</span>
        <span style={{ color: "var(--text-2)" }}>{b.venue}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-data text-[11px]" style={{ color: "var(--text-2)" }}>{b.eventDate}</span>
        <StatusBadge status={b.status} />
      </div>
    </Link>
  );
}

function QueueSection({ title, icon: Icon, count, children, accent }: { title: string; icon: any; count: number; children: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5" style={{ color: accent || "var(--accent)" }} />
          <span className="label-eyebrow">{title}</span>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `color-mix(in oklab, ${accent || "var(--accent)"} 16%, transparent)`, color: accent || "var(--accent)" }}>
          {count}
        </span>
      </div>
      <div>{children}</div>
      {count === 0 && (
        <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-3)" }}>All caught up — nothing waiting here</div>
      )}
    </div>
  );
}

function CCRDashboardPage() {
  const reserved = MOCK_BOOKINGS.filter((b) => b.status === "RESERVED");
  const unpaid = MOCK_BOOKINGS.filter((b) => b.payment === "UNPAID" || b.payment === "ADVANCE");
  const confirmedToday = MOCK_BOOKINGS.filter((b) => b.status === "CONFIRMED").length;

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Client relations</div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <Headphones className="h-6 w-6 text-[var(--accent)]" /> Booking intake & payments
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Confirm reservations and follow up on outstanding payments.
          </p>
        </div>
        <Link
          to="/dashboards"
          className="rounded-md border px-3 py-1.5 text-[12px] font-semibold transition hover:bg-[var(--surface-2)]"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          All dashboards
        </Link>
      </div>

      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Awaiting confirmation", value: reserved.length, note: "Reservations that need payment to proceed", icon: Phone },
            { label: "Payment follow-ups", value: unpaid.length, note: "Unpaid or partially paid bookings", icon: DollarSign },
            { label: "Confirmed today", value: confirmedToday, note: "Bookings locked in so far today", icon: CalendarCheck },
          ].map(({ label, value, note, icon: I }) => (
            <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between">
                <span className="label-eyebrow">{label}</span>
                <I className="h-4 w-4" style={{ color: "var(--accent)" }} />
              </div>
              <div className="mt-2 stat-value">{value}</div>
              <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>{note}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <QueueSection title="Reservations waiting for confirmation" icon={Phone} count={reserved.length}>
            {reserved.slice(0, 5).map((b) => <BookingRow key={b.code} b={b} />)}
          </QueueSection>
          <QueueSection title="Payment follow-ups" icon={DollarSign} count={unpaid.length} accent="var(--color-pay-advance)">
            {unpaid.slice(0, 5).map((b) => (
              <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                  <span className="font-medium">{b.client}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-data" style={{ color: "var(--text-2)" }}>ETB {b.amount.toLocaleString()}</span>
                  <PaymentBadge status={b.payment} />
                </div>
              </div>
            ))}
          </QueueSection>
        </div>

        <Link to="/bookings/new" className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-[13px] font-semibold transition hover:border-[var(--accent)] hover:bg-[var(--surface)]" style={{ borderColor: "var(--border)", color: "var(--accent)" }}>
          <Phone className="h-4 w-4" /> Create booking from client call
        </Link>
      </div>
    </AppShell>
  );
}
