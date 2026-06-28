import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarRange,
  Package,
  Users,
  BarChart3,
  Settings,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Search,
  ChevronRight,
  ClipboardCheck,
  ShieldAlert,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useActiveProfile, PROFILES } from "@/hooks/use-active-profile";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/checkout", label: "Check-in / out", icon: ClipboardCheck },
  { to: "/damage-report", label: "Damage reports", icon: ShieldAlert },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const ROLE_SUBLINKS = [
  { to: "/dashboards/ccr", label: "Client Relations (CCR)" },
  { to: "/dashboards/cto", label: "Chief Technician (CTO)" },
  { to: "/dashboards/to", label: "Technician (TO)" },
  { to: "/dashboards/oo", label: "Operations (OO)" },
  { to: "/dashboards/sk", label: "Storekeeper (SK)" },
] as const;

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: [
    "/",
    "/bookings",
    "/inventory",
    "/checkout",
    "/damage-report",
    "/staff",
    "/reports",
    "/settings",
  ],
  CCR: ["/", "/bookings", "/reports", "/settings"],
  CTO: ["/", "/bookings", "/staff", "/settings"],
  TO: ["/", "/bookings", "/checkout"],
  OO: ["/", "/bookings", "/checkout", "/staff", "/reports"],
  SK: ["/", "/checkout", "/damage-report", "/inventory"],
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  Admin: "System control & user management",
  CCR: "Client reservations & intake",
  CTO: "Technical validation & screens",
  TO: "On-site installation & testing",
  OO: "Operations scheduling & dispatch",
  SK: "Inventory checkout & damages",
};

const ROLE_WORKSPACE_PATHS = {
  CCR: "/dashboards/ccr",
  CTO: "/dashboards/cto",
  TO: "/dashboards/to",
  OO: "/dashboards/oo",
  SK: "/dashboards/sk",
} as const;

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      className="flex h-14 items-center gap-2 border-b px-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="relative h-8 w-8 shrink-0">
        <div
          className="absolute inset-0 rotate-45 rounded-[3px] border-2"
          style={{ borderColor: "var(--accent)" }}
        />
        <div
          className="absolute inset-1 rotate-45 rounded-[2px] border-2"
          style={{ borderColor: "var(--foreground)" }}
        />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[13px] font-bold tracking-[0.18em] text-foreground">VORTEX</span>
          <span
            className="text-[9px] font-semibold tracking-[0.3em]"
            style={{ color: "var(--accent)" }}
          >
            VISUAL
          </span>
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
          <span
            className={i === crumbs.length - 1 ? "font-semibold text-foreground" : ""}
            style={i === crumbs.length - 1 ? {} : { color: "var(--text-2)" }}
          >
            {decodeURIComponent(c).charAt(0).toUpperCase() +
              decodeURIComponent(c).slice(1).replace(/-/g, " ")}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(true);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [activeProfile, setActiveProfile] = useActiveProfile();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("vortex_theme") as "light" | "dark") || "dark";
    }
    return "dark";
  });
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
    localStorage.setItem("vortex_theme", theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-200"
        style={{
          width: collapsed ? 64 : 240,
          background: "var(--surface)",
          borderColor: "var(--border)",
        }}
      >
        <SidebarLogo collapsed={collapsed} />
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
          {/* Dashboard (Home) */}
          {(() => {
            const active = path === "/";
            return (
              <Link
                to="/"
                className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition"
                style={{
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--foreground)" : "var(--text-2)",
                }}
              >
                {active && (
                  <span
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-r"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <LayoutDashboard
                  className="h-4 w-4 shrink-0"
                  style={{ color: active ? "var(--accent)" : "currentColor" }}
                />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            );
          })()}

          {/* Role Workspaces / My Workspace */}
          {activeProfile.role === "Admin" ? (
            <div className="space-y-0.5">
              <Link
                to="/dashboards"
                onClick={() => {
                  if (!collapsed) {
                    setRolesOpen(!rolesOpen);
                  }
                }}
                className="group relative flex items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium transition"
                style={{
                  background: path === "/dashboards" ? "var(--surface-2)" : "transparent",
                  color: path.startsWith("/dashboards") ? "var(--foreground)" : "var(--text-2)",
                }}
              >
                <div className="flex items-center gap-3">
                  {path.startsWith("/dashboards") && (
                    <span
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-r"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  <LayoutDashboard
                    className="h-4 w-4 shrink-0"
                    style={{
                      color: path.startsWith("/dashboards") ? "var(--accent)" : "currentColor",
                    }}
                  />
                  {!collapsed && <span>Role Workspaces</span>}
                </div>
                {!collapsed && (
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${rolesOpen ? "rotate-90" : ""}`}
                  />
                )}
              </Link>

              {rolesOpen && !collapsed && (
                <div
                  className="pl-6 space-y-0.5 border-l ml-5"
                  style={{ borderColor: "var(--border)" }}
                >
                  {ROLE_SUBLINKS.map(({ to, label }) => {
                    const active = path === to;
                    return (
                      <Link
                        key={to}
                        to={to}
                        className="group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium transition"
                        style={{
                          background: active ? "var(--surface-2)" : "transparent",
                          color: active ? "var(--foreground)" : "var(--text-2)",
                        }}
                      >
                        {active && (
                          <span
                            className="absolute inset-y-1 left-0 w-0.5 rounded-r"
                            style={{ background: "var(--accent)" }}
                          />
                        )}
                        <span>{label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            (() => {
              const myRoleLabel =
                activeProfile.role === "CTO"
                  ? "Chief Tech Workspace"
                  : `${activeProfile.role} Workspace`;
              const myPath =
                ROLE_WORKSPACE_PATHS[activeProfile.role as keyof typeof ROLE_WORKSPACE_PATHS];
              const active = path === myPath;
              return (
                <Link
                  to={myPath}
                  className="group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition"
                  style={{
                    background: active ? "var(--surface-2)" : "transparent",
                    color: active ? "var(--foreground)" : "var(--text-2)",
                  }}
                >
                  {active && (
                    <span
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-r"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  <LayoutDashboard
                    className="h-4 w-4 shrink-0"
                    style={{ color: active ? "var(--accent)" : "currentColor" }}
                  />
                  {!collapsed && <span>{myRoleLabel}</span>}
                </Link>
              );
            })()
          )}

          {/* Other Nav Items */}
          {NAV.slice(1).map(({ to, label, icon: Icon }) => {
            // Filter nav links based on active user role permissions
            const isPermitted = ROLE_PERMISSIONS[activeProfile.role]?.includes(to);
            if (!isPermitted) return null;

            const active = path.startsWith(to);
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
                  <span
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-r"
                    style={{ background: "var(--accent)" }}
                  />
                )}
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: active ? "var(--accent)" : "currentColor" }}
                />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t p-2 relative" style={{ borderColor: "var(--border)" }}>
          {/* Profile Switcher Popover */}
          {showSwitcher && !collapsed && (
            <>
              {/* Click-outside overlay */}
              <div className="fixed inset-0 z-40" onClick={() => setShowSwitcher(false)} />
              <div
                className="profile-popover absolute bottom-[98px] left-2 right-2 z-50 rounded-xl border p-2 shadow-2xl flex flex-col gap-1.5"
                style={{
                  background: theme === "dark" ? "#1b1b1f" : "#ffffff",
                  borderColor: theme === "dark" ? "#2a2a30" : "#e4e4e7",
                  boxShadow:
                    "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
                }}
              >
                <div
                  className="px-2.5 py-1.5 flex items-center justify-between border-b pb-2"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-3)" }}
                  >
                    Control Workspaces
                  </span>
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-2)] font-data"
                    style={{ color: "var(--text-2)" }}
                  >
                    {PROFILES.length} Roles
                  </span>
                </div>
                <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin pr-0.5">
                  {PROFILES.map((p) => {
                    const isActive = activeProfile.role === p.role;
                    return (
                      <button
                        key={p.role}
                        onClick={() => {
                          setActiveProfile(p);
                          setShowSwitcher(false);
                        }}
                        className={`switcher-item ${isActive ? "active" : ""}`}
                        style={{
                          background: isActive ? "var(--surface-2)" : "transparent",
                          borderColor: isActive ? "var(--accent)" : "transparent",
                        }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold transition-all duration-200"
                          style={{
                            background: isActive ? "var(--accent)" : "var(--surface-2)",
                            color: isActive ? "var(--accent-foreground)" : "var(--text-2)",
                            border: isActive ? "none" : "1px solid var(--border)",
                            boxShadow: isActive ? "0 0 12px rgba(245, 183, 49, 0.3)" : "none",
                          }}
                        >
                          {p.initials}
                        </div>
                        <div className="flex-1 leading-tight min-w-0">
                          <div
                            className="font-semibold truncate flex items-center gap-1.5 text-[12px]"
                            style={{ color: isActive ? "var(--accent)" : "var(--foreground)" }}
                          >
                            {p.name}
                          </div>
                          <div
                            className="text-[9.5px] mt-0.5 truncate"
                            style={{ color: "var(--text-3)" }}
                          >
                            {ROLE_DESCRIPTIONS[p.role]}
                          </div>
                        </div>
                        {isActive && (
                          <div
                            className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                            style={{
                              background: "var(--accent)",
                              boxShadow: "0 0 6px var(--accent)",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 border-t pt-1.5" style={{ borderColor: "var(--border)" }}>
                  <button
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium transition hover:bg-destructive/10 hover:text-destructive"
                    style={{ color: "var(--text-3)" }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}

          {!collapsed ? (
            <button
              onClick={() => setShowSwitcher(!showSwitcher)}
              className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-150 border"
              style={{
                borderColor: showSwitcher ? "var(--accent)" : "var(--border)",
                background: showSwitcher ? "var(--surface-2)" : "transparent",
              }}
            >
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold shrink-0"
                style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
              >
                {activeProfile.initials}
              </div>
              <div className="flex-1 leading-tight min-w-0">
                <div className="text-[11px] font-semibold truncate text-foreground">
                  {activeProfile.name}
                </div>
                <div className="text-[9px] font-medium truncate" style={{ color: "var(--text-3)" }}>
                  {activeProfile.role}
                </div>
              </div>
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${showSwitcher ? "rotate-90" : ""}`}
                style={{ color: "var(--text-3)" }}
              />
            </button>
          ) : (
            <button
              onClick={() => setCollapsed(false)}
              className="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold mx-auto"
              style={{
                background: activeProfile.color || "var(--accent)",
                color: "var(--accent-foreground)",
              }}
              title={`Active role: ${activeProfile.role}`}
            >
              {activeProfile.initials}
            </button>
          )}

          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[12px] font-medium transition hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-2)" }}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
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
              <Search
                className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                style={{ color: "var(--text-3)" }}
              />
              <input
                placeholder="Search bookings, clients, codes…"
                className="h-8 w-72 rounded-md border bg-[var(--surface-2)] pl-8 pr-3 text-[12px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--surface-2)]"
              style={{ borderColor: "var(--border)" }}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" style={{ color: "var(--accent)" }} />
              ) : (
                <Moon className="h-4 w-4" style={{ color: "var(--accent)" }} />
              )}
            </button>
            <Link
              to="/notifications"
              aria-label="Open notifications"
              className="relative flex h-8 w-8 items-center justify-center rounded-md border"
              style={{ borderColor: "var(--border)" }}
            >
              <Bell className="h-4 w-4" style={{ color: "var(--text-2)" }} />
              <span
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
