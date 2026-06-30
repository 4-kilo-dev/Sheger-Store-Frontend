import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, ClipboardCheck, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { MOCK_BOOKINGS, type Booking } from "@/features/bookings/services/bookings.api";

const _Route = createFileRoute("/dashboards/cto")({
  head: () => ({
    meta: [
      { title: "CTO Dashboard · Vortex Visual" },
      { name: "description", content: "Chief Technician Operational Workspace." },
    ],
  }),
  component: CtoDashboard,
});

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

export function CtoDashboard() {
  const confirmed = MOCK_BOOKINGS.filter((b) => b.status === "CONFIRMED");
  const assigned = MOCK_BOOKINGS.filter((b) => b.status === "ASSIGNED");
  const inPrep = MOCK_BOOKINGS.filter((b) => b.status === "PREPARATION");

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Technical operations</div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-[var(--accent)]" /> Screen config & crew assignment
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Review confirmed bookings, verify screen specs, and assign lead technicians.
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
            { label: "Pending tech review", value: confirmed.length, note: "Confirmed bookings you need to assign", icon: Wrench },
            { label: "Assigned to technicians", value: assigned.length, note: "Waiting for technician acceptance", icon: Users },
            { label: "In preparation", value: inPrep.length, note: "BOM and design work underway", icon: ClipboardCheck },
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

        <QueueSection title="Bookings ready for tech review" icon={Wrench} count={confirmed.length}>
          {confirmed.slice(0, 6).map((b) => (
            <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                <span className="font-medium">{b.client}</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span className="font-data text-[11px]" style={{ color: "var(--text-2)" }}>{b.screenType} · {b.size}sqm</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-md border px-2 py-1 text-[10px] font-data" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.arrangement}</span>
                <Button variant="default" size="sm" asChild className="h-auto py-1 text-[10px]">
                  <Link to="/bookings/$code" params={{ code: b.code }}>
                    Review & assign
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </QueueSection>

        <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="label-eyebrow mb-3">Screen availability</div>
          <div className="grid gap-2 md:grid-cols-3">
            {["P2.97", "P4", "P3.91 INDOOR"].map((type) => {
              const bookingsUsing = MOCK_BOOKINGS.filter((b) => b.screenType === type && ["RESERVED","CONFIRMED","ASSIGNED","ACCEPTED","PREPARATION","ONSITE"].includes(b.status));
              return (
                <div key={type} className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <div className="font-data text-[12px] font-bold">{type}</div>
                  <div className="mt-1 text-[11px]" style={{ color: "var(--text-2)" }}>{bookingsUsing.length} active bookings</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
