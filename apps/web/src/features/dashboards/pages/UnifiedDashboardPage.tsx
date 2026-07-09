import { useAuthUser } from "@/hooks/use-auth-user";
import { AppShell } from "@/components/app-shell";
import { ROLE_LAYOUTS, WIDGET_REGISTRY } from "../config/dashboard-widgets";
import { WidgetRenderer } from "../components/WidgetRenderer";

export function UnifiedDashboardPage() {
  const authUser = useAuthUser();
  const queryRole = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("role") : null;
  const role = queryRole || authUser?.role?.toLowerCase() || "technician";

  const config = ROLE_LAYOUTS[role] || ROLE_LAYOUTS.technician;
  const layout = config.widgets;

  // Dynamic header copy based on active role
  const headerInfo = {
    eyebrow: config.eyebrow || "Operations Workspace",
    title: config.title || `${authUser?.name || 'User'} control panel`,
    description: config.description || "Your operations control center. "
  }

  return (
    <AppShell>
      {/* Dynamic Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end justify-between sm:gap-4">
        <div>
          <div className="label-eyebrow mb-1">{headerInfo.eyebrow}</div>
          <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight">{headerInfo.title}</h1>
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
