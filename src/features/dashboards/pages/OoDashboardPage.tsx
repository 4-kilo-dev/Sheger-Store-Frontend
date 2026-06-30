import { createFileRoute, Link } from "@tanstack/react-router";
import { RadioTower, Truck, Utensils, PackageCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getBookingsApi } from "@/features/bookings/services/bookings.api";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

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
  const { data: bookingsList = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const readyToDispatch = useMemo(() => bookingsList.filter((b) => b.status === "PREPARATION"), [bookingsList]);
  const onsite = useMemo(() => bookingsList.filter((b) => b.status === "ONSITE"), [bookingsList]);
  const completed = useMemo(() => bookingsList.filter((b) => b.status === "COMPLETED"), [bookingsList]);

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
        <Button variant="outline" size="default" asChild>
          <Link to="/dashboards">
            All dashboards
          </Link>
        </Button>
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
                <Button variant="default" size="sm" asChild className="h-auto py-1 text-[10px]">
                  <Link to="/bookings/$code" params={{ code: b.code }}>
                    Dispatch team
                  </Link>
                </Button>
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
                <Button variant="outline" size="sm" asChild className="h-auto py-1 text-[10px]">
                  <Link to="/checkout">
                    Check out
                  </Link>
                </Button>
              </div>
            ))}
          </QueueSection>
        </div>
      </div>
    </AppShell>
  );
}
