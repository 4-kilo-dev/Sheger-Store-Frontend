import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Headphones, Wrench, ClipboardCheck, RadioTower, PackageCheck, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { MOCK_BOOKINGS } from "@/features/bookings/services/bookings.api";
import { useActiveProfile } from "@/hooks/use-active-profile";

const _Route = createFileRoute("/dashboards/")({
  head: () => ({
    meta: [
      { title: "Operational Dashboards · Vortex Visual" },
      { name: "description", content: "Access role-specific workspaces for booking and logistics operations." },
    ],
  }),
  component: DashboardsPortal,
});

export function DashboardsPortal() {
  const [activeProfile] = useActiveProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeProfile.role !== "Admin") {
      const myRoleKey = activeProfile.role.toLowerCase();
      navigate({ to: `/dashboards/${myRoleKey}` });
    }
  }, [activeProfile.role]);

  // Compute active queues dynamically
  const ccrQueue = MOCK_BOOKINGS.filter((b) => b.status === "RESERVED").length;
  const ctoQueue = MOCK_BOOKINGS.filter((b) => b.status === "CONFIRMED").length;
  const toQueue = MOCK_BOOKINGS.filter((b) => b.status === "ASSIGNED").length;
  const ooQueue = MOCK_BOOKINGS.filter((b) => b.status === "PREPARATION").length;
  const skQueue = MOCK_BOOKINGS.filter((b) => b.status === "COMPLETED").length;

  const ROLES = [
    {
      key: "ccr",
      name: "Client Relations (CCR)",
      icon: Headphones,
      subtitle: "Intake & payments",
      path: "/dashboards/ccr" as const,
      description: "Register screen reservations, track payments, and confirm bookings with clients.",
      queueCount: ccrQueue,
      queueLabel: "awaiting confirmation",
      color: "var(--accent)",
    },
    {
      key: "cto",
      name: "Chief Technician (CTO)",
      icon: Wrench,
      subtitle: "Technical design",
      path: "/dashboards/cto" as const,
      description: "Check setup feasibility, approve screen configurations, and assign lead technicians.",
      queueCount: ctoQueue,
      queueLabel: "pending assignment",
      color: "var(--accent)",
    },
    {
      key: "to",
      name: "Technician (TO)",
      icon: ClipboardCheck,
      subtitle: "Field setup & prep",
      path: "/dashboards/to" as const,
      description: "Accept briefs, prepare the bill of materials and cabling, then run the onsite setup.",
      queueCount: toQueue,
      queueLabel: "new assignments",
      color: "var(--color-status-accepted)",
    },
    {
      key: "oo",
      name: "Operations Officer (OO)",
      icon: RadioTower,
      subtitle: "Logistics & crew",
      path: "/dashboards/oo" as const,
      description: "Dispatch transport, assign drivers and support crew, and manage onsite logistics.",
      queueCount: ooQueue,
      queueLabel: "ready for dispatch",
      color: "var(--accent)",
    },
    {
      key: "sk",
      name: "Storekeeper (SK)",
      icon: PackageCheck,
      subtitle: "Warehouse & inventory",
      path: "/dashboards/sk" as const,
      description: "Track physical inventory, process equipment check-ins and check-outs, and flag damages.",
      queueCount: skQueue,
      queueLabel: "pending return",
      color: "var(--color-bom-returned)",
    },
  ] as const;

  return (
    <AppShell>
      <div className="mb-8 max-w-2xl">
        <div className="label-eyebrow mb-1">Dashboards</div>
        <h1 className="text-[28px] font-bold tracking-tight">Choose your workspace</h1>
        <p className="mt-1 text-[13px]" style={{ color: "var(--text-2)" }}>
          Each workspace shows the queues, stats, and actions relevant to your role.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ROLES.map(({ key, name, icon: Icon, subtitle, path, description, queueCount, queueLabel, color }) => (
          <div
            key={key}
            className="flex flex-col justify-between rounded-lg border p-5 transition hover:scale-[1.01] hover:shadow-lg"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div>
              <div className="flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{
                    background: "var(--surface-2)",
                    color: color,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {queueCount > 0 ? (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
                    style={{
                      background: `color-mix(in oklab, ${color} 12%, transparent)`,
                      color: color,
                    }}
                  >
                    {queueCount} {queueLabel}
                  </span>
                  ) : (
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    All clear
                  </span>
                )}
              </div>

              <div className="mt-4">
                <h3 className="text-[15px] font-bold text-foreground">{name}</h3>
                <div className="text-[10px] uppercase font-mono tracking-wider mt-0.5" style={{ color: "var(--text-3)" }}>
                  {subtitle}
                </div>
                <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--border)" }}>
              <Link
                to={path}
                className="flex items-center justify-between text-[12px] font-bold transition group"
                style={{ color: "var(--accent)" }}
              >
                <span>Open workspace</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
