import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Banknote, CalendarCheck, Download, Gauge, TrendingUp, BarChart3, PieChart, Users, Filter } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MOCK_BOOKINGS, STATUS_ORDER, STATUS_LABELS, type BookingStatus } from "@/lib/mock-bookings";
import { MOCK_INVENTORY } from "@/lib/mock-inventory";
import { STAFF } from "@/lib/mock-operations";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports · Vortex Visual" },
      { name: "description", content: "Booking, revenue, equipment, and crew performance reports." },
    ],
  }),
  component: ReportsPage,
});

const MONTHS = [
  { m: "Jan", revenue: 892000, bookings: 12 },
  { m: "Feb", revenue: 1105000, bookings: 15 },
  { m: "Mar", revenue: 980000, bookings: 13 },
  { m: "Apr", revenue: 1420000, bookings: 19 },
  { m: "May", revenue: 1285000, bookings: 17 },
  { m: "Jun", revenue: 1840000, bookings: 24 },
];

const STATUS_COLORS: Record<BookingStatus, string> = {
  RESERVED: "var(--color-status-reserved)",
  CONFIRMED: "var(--color-status-confirmed)",
  ASSIGNED: "var(--color-status-assigned)",
  ACCEPTED: "var(--color-status-accepted)",
  PREPARATION: "var(--color-status-preparation)",
  ONSITE: "var(--color-status-onsite)",
  COMPLETED: "var(--color-status-completed)",
  DONE: "var(--color-status-done)",
};

function ReportsPage() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const stats = useMemo(() => {
    const totalRevenue = MOCK_BOOKINGS.reduce((s, b) => s + b.amount, 0);
    const completedJobs = MOCK_BOOKINGS.filter((b) => b.status === "COMPLETED" || b.status === "DONE").length;
    const totalInv = MOCK_INVENTORY.reduce((a, i) => a + i.total, 0);
    const onsiteInv = MOCK_INVENTORY.reduce((a, i) => a + i.onsite, 0);
    const utilization = Math.round(((totalInv - MOCK_INVENTORY.reduce((a, i) => a + i.available, 0)) / totalInv) * 100);
    const avgJobValue = Math.round(totalRevenue / MOCK_BOOKINGS.length / 1000);
    return { totalRevenue, completedJobs, utilization, avgJobValue };
  }, []);

  const statusDist = useMemo(() => {
    const dist: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => { dist[s] = MOCK_BOOKINGS.filter((b) => b.status === s).length; });
    return dist;
  }, []);

  const paymentSummary = useMemo(() => ({
    paid: MOCK_BOOKINGS.filter((b) => b.payment === "PAID"),
    advance: MOCK_BOOKINGS.filter((b) => b.payment === "ADVANCE"),
    unpaid: MOCK_BOOKINGS.filter((b) => b.payment === "UNPAID"),
  }), []);

  const equipmentUtil = [
    { name: "P2.97 New", used: 64, total: 192 },
    { name: "P3.91 Outdoor", used: 68, total: 144 },
    { name: "P4 Cabinets", used: 74, total: 96 },
    { name: "Novastar Proc.", used: 5, total: 12 },
    { name: "Generators", used: 2, total: 3 },
  ];

  const maxRevenue = Math.max(...MONTHS.map((m) => m.revenue));

  const crewPerformance = STAFF.slice(0, 6).map((s) => ({
    name: s.name,
    role: s.role,
    jobs: s.jobs,
    capacity: s.capacity,
    utilization: Math.round((s.jobs / s.capacity) * 100),
    avgTurnaround: (1.5 + Math.random() * 2).toFixed(1),
  }));

  function exportCSV() {
    const headers = ["Code", "Client", "Venue", "Event Date", "Screen Type", "Size", "Status", "Payment", "Amount"];
    const rows = MOCK_BOOKINGS.map((b) =>
      [b.code, b.client, b.venue, b.eventDate, b.screenType, b.size, b.status, b.payment, b.amount].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vortex-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Business Intelligence</div>
          <h1 className="text-[24px] font-bold tracking-tight">Operations Reports</h1>
          <p className="mt-1 text-[12px] text-text-2">A consolidated view of booking volume, collections, stock use, and crew output.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border" style={{ borderColor: "var(--border)" }}>
            {(["month", "quarter", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-1.5 text-[11px] font-semibold capitalize transition"
                style={{
                  background: period === p ? "var(--accent)" : "transparent",
                  color: period === p ? "var(--accent-foreground)" : "var(--text-2)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Booked Revenue", value: `${(stats.totalRevenue / 1000000).toFixed(2)}M ETB`, note: "+14.2% vs last month", icon: Banknote },
          { label: "Completed Jobs", value: String(stats.completedJobs), note: `${Math.round((stats.completedJobs / MOCK_BOOKINGS.length) * 100)}% completion rate`, icon: CalendarCheck },
          { label: "Fleet Utilization", value: `${stats.utilization}%`, note: "LED cabinet fleet", icon: Gauge },
          { label: "Avg. Job Value", value: `${stats.avgJobValue}K`, note: "+6.8% this quarter", icon: TrendingUp },
        ].map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center justify-between">
              <span className="label-eyebrow">{label}</span>
              <Icon className="h-4 w-4" style={{ color: "var(--accent)" }} />
            </div>
            <div className="mt-3 text-[22px] font-bold">{value}</div>
            <div className="mt-1 text-[11px] text-text-2">{note}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* Revenue Trend */}
        <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-bold">Revenue Trend</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Last 6 months</span>
          </div>
          <div className="p-4">
            <div className="flex h-64 items-end gap-3 border-b border-l px-3 pb-3" style={{ borderColor: "var(--border)" }}>
              {MONTHS.map((x) => (
                <div key={x.m} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <div className="relative w-full">
                    <div
                      className="w-full rounded-t-sm transition-all group-hover:brightness-125"
                      style={{ height: `${(x.revenue / maxRevenue) * 200}px`, background: "var(--accent)", opacity: 0.85 }}
                    />
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[9px] font-mono font-semibold opacity-0 transition group-hover:opacity-100">
                      {(x.revenue / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold" style={{ color: "var(--text-2)" }}>{x.m}</span>
                  <span className="text-[8px] font-mono" style={{ color: "var(--text-3)" }}>{x.bookings} jobs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment Utilization */}
        <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Gauge className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-bold">Equipment Utilization</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>Current</span>
          </div>
          <div className="space-y-4 p-4">
            {equipmentUtil.map(({ name, used, total }) => {
              const pct = Math.round((used / total) * 100);
              return (
                <div key={name}>
                  <div className="mb-2 flex justify-between text-[12px]">
                    <span className="font-medium">{name}</span>
                    <span className="font-mono font-bold">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: pct > 80 ? "var(--destructive)" : pct > 60 ? "var(--color-pay-advance)" : "var(--accent)",
                      }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] font-mono" style={{ color: "var(--text-3)" }}>{used} used / {total} total</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {/* Status Distribution */}
        <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <PieChart className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-bold">Booking Status Distribution</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 p-4">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="rounded-md border p-3 text-center" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                <div className="text-[18px] font-bold" style={{ color: STATUS_COLORS[s] }}>{statusDist[s]}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: STATUS_COLORS[s] }}>
                  {STATUS_LABELS[s]}
                </div>
              </div>
            ))}
          </div>
          {/* Mini bar chart */}
          <div className="flex gap-0.5 px-4 pb-4">
            {STATUS_ORDER.map((s) => (
              <div
                key={s}
                className="h-3 rounded-sm"
                style={{
                  width: `${(statusDist[s] / MOCK_BOOKINGS.length) * 100}%`,
                  background: STATUS_COLORS[s],
                }}
                title={`${STATUS_LABELS[s]}: ${statusDist[s]}`}
              />
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <Banknote className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              <span className="text-[13px] font-bold">Payment Collection Summary</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Paid", data: paymentSummary.paid, color: "var(--color-pay-paid)" },
                { label: "Advance", data: paymentSummary.advance, color: "var(--color-pay-advance)" },
                { label: "Unpaid", data: paymentSummary.unpaid, color: "var(--color-pay-unpaid)" },
              ].map(({ label, data, color }) => (
                <div key={label} className="rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                  </div>
                  <div className="mt-2 text-[20px] font-bold">{data.length}</div>
                  <div className="mt-1 font-mono text-[11px]" style={{ color: "var(--text-2)" }}>
                    ETB {data.reduce((s, b) => s + b.amount, 0).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            {/* Payment distribution bar */}
            <div className="mt-3 flex h-4 overflow-hidden rounded-full">
              <div style={{ width: `${(paymentSummary.paid.length / MOCK_BOOKINGS.length) * 100}%`, background: "var(--color-pay-paid)" }} />
              <div style={{ width: `${(paymentSummary.advance.length / MOCK_BOOKINGS.length) * 100}%`, background: "var(--color-pay-advance)" }} />
              <div style={{ width: `${(paymentSummary.unpaid.length / MOCK_BOOKINGS.length) * 100}%`, background: "var(--color-pay-unpaid)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Crew Performance */}
      <div className="mt-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-[13px] font-bold">Crew Performance</span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>This quarter</span>
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              {["Staff Member", "Role", "Jobs", "Capacity", "Utilization", "Avg. Turnaround"].map((h) => (
                <th key={h} className="border-b px-4 py-2.5 text-left label-eyebrow" style={{ borderColor: "var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crewPerformance.map((p) => (
              <tr key={p.name} className="border-b last:border-0 transition hover:bg-[var(--surface-2)]" style={{ borderColor: "var(--border)" }}>
                <td className="px-4 py-3 font-semibold">{p.name}</td>
                <td className="px-4 py-3" style={{ color: "var(--text-2)" }}>{p.role}</td>
                <td className="px-4 py-3 font-mono font-bold">{p.jobs}</td>
                <td className="px-4 py-3 font-mono" style={{ color: "var(--text-2)" }}>{p.capacity}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${p.utilization}%`, background: p.utilization > 80 ? "var(--destructive)" : "var(--accent)" }} />
                    </div>
                    <span className="font-mono font-semibold" style={{ color: p.utilization > 80 ? "var(--destructive)" : "var(--accent)" }}>{p.utilization}%</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono" style={{ color: "var(--text-2)" }}>{p.avgTurnaround} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export */}
      <div className="mt-4 flex items-center justify-between rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div>
          <h2 className="text-[14px] font-bold">Export operational report</h2>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>Generate a booking, payment, inventory, or team performance report.</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-md border px-4 py-2 text-[12px] font-semibold transition hover:border-[var(--accent)]"
          style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>
    </AppShell>
  );
}