import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarRange, Package, Users, BarChart3, Settings,
  Bell, ChevronsLeft, ChevronsRight, Search, Globe, ChevronRight,
} from "lucide-react";
import { useState, type ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: "var(--border)" }}>
      <div className="relative h-8 w-8 shrink-0">
        <div className="absolute inset-0 rotate-45 rounded-[3px] border-2" style={{ borderColor: "var(--accent)" }} />
        <div className="absolute inset-1 rotate-45 rounded-[2px] border-2" style={{ borderColor: "#F1F1F3" }} />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-bold tracking-[0.18em] text-foreground">VORTEX</span>
          <span className="text-[9px] font-semibold tracking-[0.3em]" style={{ color: "var(--accent)" }}>VISUAL</span>
        </div>
      )}
    </div>
  );
}

function Breadcrumb() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const parts = path.split("/").filter(Boolean);
  const crumbs = parts.length === 0 ? ["Dashboard"] : parts;
  return (
    <nav className="flex items-center gap-1.5 text-[13px]">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />}
          <span className={i === crumbs.length - 1 ? "font-semibold text-foreground" : ""} style={i === crumbs.length - 1 ? {} : { color: "var(--text-2)" }}>
            {c.charAt(0).toUpperCase() + c.slice(1)}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-200"
        style={{ width: collapsed ? 64 : 240, background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <SidebarLogo collapsed={collapsed} />
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition"
                style={{
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--foreground)" : "var(--text-2)",
                }}
              >
                {active && (
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r" style={{ background: "var(--accent)" }} />
                )}
                <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "var(--accent)" : "currentColor" }} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="m-2 flex items-center justify-center gap-2 rounded-md py-2 text-[12px] font-medium transition hover:bg-[var(--surface-2)]"
          style={{ color: "var(--text-2)" }}
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span>Collapse</span></>}
        </button>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col" style={{ marginLeft: collapsed ? 64 : 240 }}>
        <header
          className="sticky top-0 z-20 flex h-14 items-center justify-between border-b px-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <Breadcrumb />
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
              <input
                placeholder="Search bookings, clients, codes…"
                className="h-8 w-72 rounded-md border bg-[var(--surface-2)] pl-8 pr-3 text-[12px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button className="flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold uppercase tracking-wider" style={{ borderColor: "var(--border)", color: "var(--text-2)" }}>
              <Globe className="h-3.5 w-3.5" />
              EN <span style={{ color: "var(--text-3)" }}>|</span> <span style={{ color: "var(--text-3)" }}>አማ</span>
            </button>
            <button className="relative flex h-8 w-8 items-center justify-center rounded-md border" style={{ borderColor: "var(--border)" }}>
              <Bell className="h-4 w-4" style={{ color: "var(--text-2)" }} />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
            </button>
            <div className="flex h-8 items-center gap-2 rounded-md border pl-1 pr-2.5" style={{ borderColor: "var(--border)" }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>NB</div>
              <div className="leading-tight">
                <div className="text-[12px] font-semibold">Nathan B.</div>
                <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Admin</div>
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
