import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StatusStepper } from "@/components/status-stepper";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Vortex Visual" },
      { name: "description", content: "Operations control center for LED screen rentals and installations." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="label-eyebrow mb-1">Control Room</div>
          <h1 className="text-[24px] font-bold tracking-tight">Operations Dashboard</h1>
        </div>
        <Link to="/bookings" className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
          Open Bookings <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          { label: "Bookings · This Month", value: "47", trend: "+12%" },
          { label: "Revenue (PAID + ADVANCE)", value: "1,284,500 ETB", trend: "+8%" },
          { label: "Equipment Onsite", value: "9", trend: "Live" },
          { label: "Assemblies · 7 Days", value: "6", trend: "Upcoming" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="label-eyebrow">{s.label}</div>
            <div className="mt-2 text-[22px] font-bold tracking-tight">{s.value}</div>
            <div className="mt-1 text-[11px] font-semibold" style={{ color: "var(--accent)" }}>{s.trend}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border p-6" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <div className="label-eyebrow">Booking · SB047</div>
            <h2 className="mt-1 text-[18px] font-bold">Sheraton Addis · Annual Gala</h2>
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-2)" }}>Current status: <span className="font-semibold" style={{ color: "var(--accent)" }}>PREPARATION</span></div>
        </div>
        <StatusStepper current="PREPARATION" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[{ label: "Warehouse availability", value: "323 units ready", to: "/inventory" as const }, { label: "Maintenance alerts", value: "3 groups due", to: "/inventory" as const }, { label: "Damaged equipment", value: "15 units on hold", to: "/inventory" as const }].map((item) => (
          <Link key={item.label} to={item.to} className="rounded-lg border p-4 transition hover:border-accent" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="label-eyebrow">{item.label}</div><div className="mt-2 text-[15px] font-bold">{item.value}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
