import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useEffect } from "react";
import { useActiveProfile } from "@/hooks/use-active-profile";
import {
  ArrowRight, CalendarRange, Plus, Package, ShieldAlert, BarChart3,
  TrendingUp, Clock, MapPin, Users, Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusStepper } from "@/components/status-stepper";
import { StatusBadge, PaymentBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { PendingTasksWidget } from "@/features/notifications/components/PendingTasksWidget";
import { MOCK_BOOKINGS } from "@/features/bookings/services/bookings.api";
import { MOCK_INVENTORY } from "@/features/inventory/services/inventory.api";

const _Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Vortex Visual" },
      { name: "description", content: "Operations control center for LED screen rentals and installations." },
    ],
  }),
  component: AdminDashboard,
});

export function AdminDashboard() {
  const [activeProfile] = useActiveProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeProfile.role !== "Admin") {
      const myRoleKey = activeProfile.role.toLowerCase();
      navigate({ to: `/dashboards/${myRoleKey}` });
    }
  }, [activeProfile.role]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = MOCK_BOOKINGS.filter((b) => {
      const d = new Date(b.eventDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const revenue = thisMonth.reduce((s, b) => s + b.amount, 0);
    const onsite = MOCK_BOOKINGS.filter((b) => b.status === "ONSITE");
    const upcoming = MOCK_BOOKINGS.filter((b) => {
      const d = new Date(b.assemblyDate);
      const diff = (d.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    });
    const paid = MOCK_BOOKINGS.filter((b) => b.payment === "PAID").length;
    const totalInv = MOCK_INVENTORY.reduce((a, i) => a + i.total, 0);
    const availInv = MOCK_INVENTORY.reduce((a, i) => a + i.available, 0);
    return { thisMonth: thisMonth.length, revenue, onsite: onsite.length, upcoming: upcoming.length, paid, totalInv, availInv };
  }, []);

  const recentBookings = MOCK_BOOKINGS.slice(0, 6);
  const onsiteBookings = MOCK_BOOKINGS.filter((b) => b.status === "ONSITE").slice(0, 4);
  const featured = MOCK_BOOKINGS.find((b) => b.status === "PREPARATION") ?? MOCK_BOOKINGS[4];

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="label-eyebrow mb-1">Today's operations</div>
          <h1 className="text-[24px] font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            Bookings, equipment, and crew at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="link" size="default" asChild>
            <Link to="/bookings">
              All bookings <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Bookings this month", value: String(stats.thisMonth), trend: `${stats.paid} paid`, icon: CalendarRange, color: "var(--accent)" },
          { label: "Revenue", value: `${(stats.revenue / 1000).toFixed(0)}K ETB`, trend: "+14.2% from last month", icon: TrendingUp, color: "var(--color-bom-returned)" },
          { label: "Screens onsite", value: String(stats.onsite), trend: "Active right now", icon: Package, color: "var(--color-status-accepted)" },
          { label: "Assemblies this week", value: String(stats.upcoming), trend: "Next 7 days", icon: Clock, color: "var(--color-pay-advance)" },
        ].map((s) => (
          <div key={s.label} className="group rounded-lg border p-4 transition hover:border-[var(--accent)]" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <div className="label-eyebrow">{s.label}</div>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <div className="stat-value mt-2">{s.value}</div>
            <div className="mt-1 text-[11px] font-semibold" style={{ color: s.color }}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "New booking", icon: Plus, to: "/bookings/new" as const, variant: "default" as const },
          { label: "Check out equipment", icon: Package, to: "/checkout" as const, variant: "outline" as const },
          { label: "Report damage", icon: ShieldAlert, to: "/damage-report" as const, variant: "outline" as const },
          { label: "View reports", icon: BarChart3, to: "/reports" as const, variant: "outline" as const },
        ].map(({ label, icon: Icon, to, variant }) => (
          <Button key={label} variant={variant} size="default" asChild className="h-auto p-3.5">
            <Link to={to} className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[12px] font-semibold">{label}</span>
            </Link>
          </Button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-12 gap-4">
        {/* Featured Booking */}
        <div className="col-span-12 xl:col-span-8 rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="mb-4 flex items-baseline justify-between">
            <div>
              <div className="label-eyebrow">{featured.code}</div>
              <h2 className="mt-1 text-[18px] font-bold">{featured.client} · {featured.venue}</h2>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={featured.status} />
              <Button variant="link" size="default" asChild>
                <Link to="/bookings/$code" params={{ code: featured.code }}>
                  Open booking →
                </Link>
              </Button>
            </div>
          </div>
          <StatusStepper current={featured.status} />
        </div>

        {/* Equipment Summary & Task Center */}
        <div className="col-span-12 xl:col-span-4 flex flex-col gap-4">
          <div className="rounded-lg border p-5 flex-1" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="label-eyebrow mb-4">Equipment pool</div>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--surface-2)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-bom-returned)" strokeWidth="3" strokeDasharray={`${(stats.availInv / stats.totalInv) * 88} 88`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-[16px] font-bold">{Math.round((stats.availInv / stats.totalInv) * 100)}%</div>
                  <div className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Available</div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: "Available", value: stats.availInv, color: "var(--color-bom-returned)" },
                  { label: "Reserved", value: stats.totalInv - stats.availInv - MOCK_INVENTORY.reduce((a, i) => a + i.onsite, 0), color: "var(--color-pay-advance)" },
                  { label: "Onsite", value: MOCK_INVENTORY.reduce((a, i) => a + i.onsite, 0), color: "var(--color-status-accepted)" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                      {label}
                    </span>
                    <span className="font-data font-semibold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" size="default" asChild className="mt-4 w-full">
              <Link to="/inventory">
                View inventory <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <PendingTasksWidget />
        </div>
      </div>

      {/* Recent Bookings Table */}
      <div className="mt-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span className="label-eyebrow">Recent bookings</span>
          </div>
          <Button variant="link" size="default" asChild>
            <Link to="/bookings">All bookings →</Link>
          </Button>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {["Code", "Client", "Venue", "Event Date", "Screen", "Status", "Payment"].map((h) => (
                  <th key={h} className="border-b px-4 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b, i) => (
                <tr key={b.code} className="transition hover:bg-[var(--surface-2)]" style={{ background: i % 2 === 0 ? "var(--surface)" : "transparent" }}>
                  <td className="border-b px-4 py-2.5 font-bold" style={{ borderColor: "var(--border)" }}>
                    <Button variant="link" size="default" asChild>
                      <Link to="/bookings/$code" params={{ code: b.code }}>
                        {b.code}
                      </Link>
                    </Button>
                  </td>
                  <td className="border-b px-4 py-2.5 font-medium" style={{ borderColor: "var(--border)" }}>{b.client}</td>
                  <td className="border-b px-4 py-2.5" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.venue}</td>
                  <td className="border-b px-4 py-2.5 font-data" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.eventDate}</td>
                  <td className="border-b px-4 py-2.5 font-data text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>{b.screenType}</td>
                  <td className="border-b px-4 py-2.5" style={{ borderColor: "var(--border)" }}><StatusBadge status={b.status} /></td>
                  <td className="border-b px-4 py-2.5" style={{ borderColor: "var(--border)" }}><PaymentBadge status={b.payment} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Onsite Deployments */}
      {onsiteBookings.length > 0 && (
        <div className="mt-4 rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--color-status-accepted)" }} />
            <span className="label-eyebrow">Screens onsite now</span>
            <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "color-mix(in oklab, var(--color-status-accepted) 18%, transparent)", color: "var(--color-status-accepted)" }}>
              {onsiteBookings.length} active
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {onsiteBookings.map((b) => (
              <Button key={b.code} variant="outline" size="default" asChild className="h-auto text-left p-3">
                <Link to="/bookings/$code" params={{ code: b.code }}>
                  <div className="w-full">
                    <div className="flex items-center justify-between">
                      <span className="font-data text-[12px] font-bold" style={{ color: "var(--accent)" }}>{b.code}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-2 text-[13px] font-semibold">{b.client}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
                      <MapPin className="h-3 w-3" /> {b.venue}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                      <Users className="h-3 w-3" /> {b.assignees.join(" · ")}
                    </div>
                  </div>
                </Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
