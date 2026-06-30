import { createFileRoute, Link } from "@tanstack/react-router";
import { DollarSign, Headphones, Phone, CalendarCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getBookingsApi, type Booking } from "@/features/bookings/services/bookings.api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const _Route = createFileRoute("/dashboards/ccr")({
  head: () => ({
    meta: [
      { title: "CCR Dashboard · Vortex Visual" },
      { name: "description", content: "Client Relations Operational Workspace." },
    ],
  }),
  component: CcrDashboard,
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

export function CcrDashboard() {
  const { data: bookingsList = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const reserved = useMemo(() => bookingsList.filter((b) => b.status === "RESERVED"), [bookingsList]);
  const unpaid = useMemo(() => bookingsList.filter((b) => b.payment === "UNPAID" || b.payment === "ADVANCE"), [bookingsList]);
  const confirmedToday = useMemo(() => bookingsList.filter((b) => b.status === "CONFIRMED").length, [bookingsList]);

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
        <Button variant="outline" size="default" asChild>
          <Link to="/dashboards">
            All dashboards
          </Link>
        </Button>
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

        <Button variant="outline" size="default" asChild className="h-auto py-4">
          <Link to="/bookings/new" className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" /> Create booking from client call
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}
