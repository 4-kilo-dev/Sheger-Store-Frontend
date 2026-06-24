import { createFileRoute, Link } from "@tanstack/react-router";
import { RadioTower, Truck, Utensils, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MOCK_BOOKINGS } from "@/features/bookings/services/bookings.api";

const _Route = createFileRoute("/dashboards/oo")({
  head: () => ({
    meta: [
      { title: "OO Dashboard · Vortex Visual" },
      { name: "description", content: "Operations Officer Operational Workspace." },
    ],
  }),
  component: OoDashboard,
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

export function OoDashboard() {
  const readyToDispatch = MOCK_BOOKINGS.filter((b) => b.status === "PREPARATION");
  const onsite = MOCK_BOOKINGS.filter((b) => b.status === "ONSITE");
  const completed = MOCK_BOOKINGS.filter((b) => b.status === "COMPLETED");

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Logistics & dispatch</div>
          <h1 className="text-[24px] font-bold tracking-tight flex items-center gap-2">
            <RadioTower className="h-6 w-6 text-[var(--accent)]" /> Transport, crew & site ops
          </h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Dispatch teams and vehicles, manage onsite operations, and approve meal budgets.
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
            { label: "Ready to dispatch", value: readyToDispatch.length, icon: Truck },
            { label: "Active onsite", value: onsite.length, icon: RadioTower },
            { label: "Pending check-in", value: completed.length, icon: PackageCheck },
            { label: "Meal budgets active", value: onsite.length, icon: Utensils },
          ].map(({ label, value, icon: I }) => (
            <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex items-center justify-between"><span className="label-eyebrow">{label}</span><I className="h-4 w-4" style={{ color: "var(--accent)" }} /></div>
              <div className="mt-2 stat-value">{value}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <QueueSection title="Ready to dispatch" icon={Truck} count={readyToDispatch.length}>
            {readyToDispatch.slice(0, 5).map((b) => (
              <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                    <span className="font-medium">{b.client}</span>
                  </div>
                  <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                    Team: {b.stageHand} · Driver: {b.driver} · Meal: ETB {b.mealBudget.toLocaleString()}
                  </div>
                </div>
                <Link to="/bookings/$code" params={{ code: b.code }} className="rounded-md px-3 py-1 text-[10px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                  Dispatch team
                </Link>
              </div>
            ))}
          </QueueSection>

          <QueueSection title="Equipment ready for check-out" icon={PackageCheck} count={readyToDispatch.length} accent="var(--color-pay-advance)">
            {readyToDispatch.slice(0, 5).map((b) => (
              <div key={b.code} className="flex items-center justify-between border-b py-3 px-4 text-[12px] last:border-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span className="font-data font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                  <span style={{ color: "var(--text-2)" }}>{b.bomItems.length} items in BOM</span>
                </div>
                <Link to="/checkout" className="rounded-md border px-3 py-1 text-[10px] font-semibold" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                  Check out
                </Link>
              </div>
            ))}
          </QueueSection>
        </div>
      </div>
    </AppShell>
  );
}
