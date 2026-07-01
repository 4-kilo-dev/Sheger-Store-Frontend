import { useAuthUser } from "@/hooks/use-auth-user";
import { AppShell } from "@/components/app-shell";
import { ROLE_LAYOUTS, WIDGET_REGISTRY } from "../config/dashboard-widgets";
import { WidgetRenderer } from "../components/WidgetRenderer";

export function UnifiedDashboardPage() {
  const authUser = useAuthUser();
  const queryRole = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("role") : null;
  const role = queryRole || authUser?.role?.toLowerCase() || "technician";

  const layout = ROLE_LAYOUTS[role] || ROLE_LAYOUTS.technician;

  // Dynamic header copy based on active role
  const headerInfo = (() => {
    switch (role) {
      case "admin":
      case "supervisor":
        return {
          eyebrow: "Today's operations",
          title: "Dashboard",
          description: "Bookings, equipment, and crew at a glance.",
        };
      case "ccr":
        return {
          eyebrow: "Client relations",
          title: "Booking Intake & Payments",
          description: "Confirm reservations and follow up on outstanding payments.",
        };
      case "chief_tech":
        return {
          eyebrow: "Technical operations",
          title: "Screen Config & Crew Assignment",
          description: "Review confirmed bookings, verify screen specs, and assign lead technicians.",
        };
      case "storekeeper":
        return {
          eyebrow: "Warehouse",
          title: "Inventory & Check-ins",
          description: "Verify equipment returns, process check-outs, and flag damage.",
        };
      case "oo":
      case "ops_officer":
        return {
          eyebrow: "Logistics & dispatch",
          title: "Transport, Crew & Site Ops",
          description: "Dispatch teams and vehicles, manage onsite operations, and approve meal budgets.",
        };
      case "technician":
      case "stagehand":
      case "freelancer":
        return {
          eyebrow: "Field operations",
          title: "Your Assignments & Prep",
          description: "Accept assigned bookings, prepare the bill of materials, and run your field setups.",
        };
      default:
        return {
          eyebrow: "Operations",
          title: "Control Panel",
          description: "Your operations control center.",
        };
    }
  })();

  return (
    <AppShell>
      {/* Dynamic Header */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">{headerInfo.eyebrow}</div>
          <h1 className="text-[24px] font-bold tracking-tight">{headerInfo.title}</h1>
          <p className="mt-1 text-[12px]" style={{ color: "var(--text-2)" }}>
            {headerInfo.description}
          </p>
        </div>
      </div>

      {/* Widget Layout Grid */}
      <div className="flex flex-col gap-4">
        {layout.map((widgetId) => {
          const meta = WIDGET_REGISTRY[widgetId];
          if (!meta) return null;
          return (
            <div key={widgetId} className="w-full">
              <WidgetRenderer id={widgetId} />
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
export default UnifiedDashboardPage;
