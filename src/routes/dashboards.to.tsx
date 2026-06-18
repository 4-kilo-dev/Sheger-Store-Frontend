import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ClipboardCheck, Package } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MOCK_BOOKINGS } from "@/lib/mock-bookings";

export const Route = createFileRoute("/dashboards/to")({
  head: () => ({
    meta: [
      { title: "TO Dashboard · Vortex Visual" },
      { name: "description", content: "Technician Operational Workspace." },
    ],
  }),
  component: TODashboardPage,
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

function TODashboardPage() {
  const myAssigned = MOCK_BOOKINGS.filter((b) => b.status === "ASSIGNED");
  const accepted = MOCK_BOOKINGS.filter((b) => b.status === "ACCEPTED");
  const inPrep = MOCK_BOOKINGS.filter((b) => b.status === "PREPARATION");

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Field operations</div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-[var(--accent)]" /> Your assignments & prep
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Accept assigned bookings, prepare the bill of materials, and run your field setups.
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
            { label: "New assignments", value: myAssigned.length, note: "Waiting for your acceptance", icon: ClipboardCheck },
            { label: "Accepted", value: accepted.length, note: "Ready for BOM preparation", icon: CheckCircle2 },
            { label: "In preparation", value: inPrep.length, note: "BOM and drawings in progress", icon: Package },
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

        <QueueSection title="Assignments waiting for you" icon={ClipboardCheck} count={myAssigned.length}>
          {myAssigned.slice(0, 5).map((b) => (
            <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                <span className="font-medium">{b.client}</span>
                <span style={{ color: "var(--text-3)" }}>·</span>
                <span style={{ color: "var(--text-2)" }}>{b.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-data text-[11px]" style={{ color: "var(--text-2)" }}>{b.screenType} · {b.size}sqm</span>
                <Link to="/bookings/$code" params={{ code: b.code }} className="rounded-md px-3 py-1 text-[10px] font-bold" style={{ background: "var(--color-status-accepted)", color: "#fff" }}>
                  Accept assignment
                </Link>
              </div>
            </div>
          ))}
        </QueueSection>

        <QueueSection title="Ready for BOM preparation" icon={Package} count={accepted.length} accent="var(--color-pay-advance)">
          {accepted.slice(0, 5).map((b) => (
            <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                <span className="font-medium">{b.client}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--text-3)" }}>CTO: {b.ctoNotes}</span>
                <Link to="/bookings/$code" params={{ code: b.code }} className="rounded-md border px-3 py-1 text-[10px] font-semibold shrink-0" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  Prepare BOM
                </Link>
              </div>
            </div>
          ))}
        </QueueSection>
      </div>
    </AppShell>
  );
}
