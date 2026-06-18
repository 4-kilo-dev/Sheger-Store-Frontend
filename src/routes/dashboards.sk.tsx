import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Package, PackageCheck, Truck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { MOCK_BOOKINGS } from "@/lib/mock-bookings";

export const Route = createFileRoute("/dashboards/sk")({
  head: () => ({
    meta: [
      { title: "Storekeeper Dashboard · Vortex Visual" },
      { name: "description", content: "Storekeeper Operational Workspace." },
    ],
  }),
  component: SKDashboardPage,
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

function SKDashboardPage() {
  const onsiteBookings = MOCK_BOOKINGS.filter((b) => b.status === "ONSITE");
  const completedBookings = MOCK_BOOKINGS.filter((b) => b.status === "COMPLETED");
  const damaged = MOCK_BOOKINGS.filter((b) => b.bomItems.some((item) => item.status === "Checked Out"));
  const totalAvail = useMemo(() => MOCK_BOOKINGS.reduce((s, b) => s + b.bomItems.filter((i) => i.status === "Reserved").length, 0), []);

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Warehouse</div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-[var(--accent)]" /> Inventory & check-ins
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Verify equipment returns, process check-outs, and flag damage.
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
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "Materials out", value: onsiteBookings.length, note: "Active check-outs" },
            { label: "Pending return", value: completedBookings.length, note: "Waiting for check-in" },
            { label: "Damage queue", value: 3, note: "Needs inspection" },
            { label: "Reserved items", value: totalAvail, note: "Upcoming bookings" },
          ].map(({ label, value, note }) => (
            <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <span className="label-eyebrow">{label}</span>
              <div className="mt-2 stat-value">{value}</div>
              <div className="mt-1 text-[10px]" style={{ color: "var(--text-3)" }}>{note}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <QueueSection title="Equipment waiting for check-in" icon={PackageCheck} count={completedBookings.length} accent="var(--color-bom-returned)">
            {completedBookings.slice(0, 5).map((b) => (
              <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                  <span>{b.client}</span>
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>{b.bomItems.length} items</span>
                </div>
                <Link to="/checkout" className="rounded-md px-3 py-1 text-[10px] font-bold" style={{ background: "var(--color-bom-returned)", color: "#fff" }}>
                  Check in
                </Link>
              </div>
            ))}
          </QueueSection>

          <QueueSection title="Checked-out equipment" icon={Truck} count={damaged.length} accent="var(--color-pay-advance)">
            {damaged.slice(0, 5).map((b) => (
              <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                  <span>{b.client}</span>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </QueueSection>
        </div>

        <Link to="/damage-report" className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-[13px] font-semibold transition hover:border-destructive hover:bg-[var(--surface)]" style={{ borderColor: "var(--border)", color: "var(--destructive)" }}>
          <Package className="h-4 w-4" /> Report damaged equipment
        </Link>
      </div>
    </AppShell>
  );
}
