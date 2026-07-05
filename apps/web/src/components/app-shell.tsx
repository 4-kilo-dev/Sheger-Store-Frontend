import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarRange, Package, Users, BarChart3, Settings,
  Bell, ChevronsLeft, ChevronsRight, Search, ChevronRight,
  ClipboardCheck, ShieldAlert, LogOut, Sun, Moon,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useActiveProfile, PROFILES } from "@/hooks/use-active-profile";
import { logoutApi } from "@/features/auth/services/auth.api";
import { useNotifications } from "@/features/notifications/context/NotificationsContext";

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
  { to: "/?role=ccr", label: "Client Relations (CCR)" },
  { to: "/?role=chief_tech", label: "Chief Technician (CTO)" },
  { to: "/?role=technician", label: "Technician (TO)" },
  { to: "/?role=oo", label: "Operations (OO)" },
  { to: "/?role=storekeeper", label: "Storekeeper (SK)" },
] as const;

const mapProfileToRoleKey = (profileRole: string): string => {
  switch (profileRole) {
    case "CTO": return "chief_tech";
    case "TO": return "technician";
    case "OO": return "oo";
    case "SK": return "storekeeper";
    case "SH": return "stagehand";
    case "FL": return "freelancer";
    default: return profileRole.toLowerCase();
  }
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ["/", "/bookings", "/inventory", "/checkout", "/damage-report", "/staff", "/reports", "/settings"],
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

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2 border-b px-4" style={{ borderColor: "var(--border)" }}>
      <div className="relative h-8 w-8 shrink-0">
        <div className="absolute inset-0 rotate-45 rounded-[3px] border-2" style={{ borderColor: "var(--accent)" }} />
        <div className="absolute inset-1 rotate-45 rounded-[2px] border-2" style={{ borderColor: "var(--foreground)" }} />
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
            {decodeURIComponent(c).charAt(0).toUpperCase() + decodeURIComponent(c).slice(1).replace(/-/g, " ")}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(true);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [activeProfile, setActiveProfile] = useActiveProfile();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("light") ? "light" : "dark";
    }
    return "dark";
  });

  useEffect(() => {
    // Sync React state with the actual DOM on mount
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const searchRole = (location.search as any)?.role;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-200"
        style={{ width: collapsed ? 64 : 240, background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <SidebarLogo collapsed={collapsed} />
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
          {/* Dashboard (Home) */}
          {(() => {
            const active = path === "/" && !searchRole;
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
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r" style={{ background: "var(--accent)" }} />
                )}
                <LayoutDashboard className="h-4 w-4 shrink-0" style={{ color: active ? "var(--accent)" : "currentColor" }} />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            );
          })()}

          {/* Role Workspaces / My Workspace */}
          {activeProfile.role === "Admin" ? (
            <div className="space-y-0.5">
              <Link
                to="/"
                onClick={() => {
                  if (!collapsed) {
                    setRolesOpen(!rolesOpen);
                  }
                }}
                className="group relative flex items-center justify-between rounded-md px-3 py-2 text-[13px] font-medium transition"
                style={{
                  background: path === "/" && searchRole ? "var(--surface-2)" : "transparent",
                  color: path === "/" && searchRole ? "var(--foreground)" : "var(--text-2)",
                }}
              >
                <div className="flex items-center gap-3">
                  {path === "/" && searchRole && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r" style={{ background: "var(--accent)" }} />
                  )}
                  <LayoutDashboard className="h-4 w-4 shrink-0" style={{ color: path === "/" && searchRole ? "var(--accent)" : "currentColor" }} />
                  {!collapsed && <span>Role Workspaces</span>}
                </div>
                {!collapsed && (
                  <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 ${rolesOpen ? "rotate-90" : ""}`} />
                )}
              </Link>

              {rolesOpen && !collapsed && (
                <div className="pl-6 space-y-0.5 border-l ml-5" style={{ borderColor: "var(--border)" }}>
                  {ROLE_SUBLINKS.map(({ to, label }) => {
                    const active = path === "/" && `/?role=${searchRole}` === to;
                    return (
                      <Link
                        key={to}
                        to={to as any}
                        className="group relative flex items-center gap-2 rounded-md px-3 py-1.5 text-[11px] font-medium transition"
                        style={{
                          background: active ? "var(--surface-2)" : "transparent",
                          color: active ? "var(--foreground)" : "var(--text-2)",
                        }}
                      >
                        {active && (
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-r" style={{ background: "var(--accent)" }} />
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
              const myRoleKey = mapProfileToRoleKey(activeProfile.role);
              const myRoleLabel = activeProfile.role === "CTO" ? "Chief Tech Workspace" : `${activeProfile.role} Workspace`;
              const myPath = `/?role=${myRoleKey}` as any;
              const active = path === "/" && searchRole === myRoleKey;
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
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r" style={{ background: "var(--accent)" }} />
                  )}
                  <LayoutDashboard className="h-4 w-4 shrink-0" style={{ color: active ? "var(--accent)" : "currentColor" }} />
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
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r" style={{ background: "var(--accent)" }} />
                )}
                <Icon className="h-4 w-4 shrink-0" style={{ color: active ? "var(--accent)" : "currentColor" }} />
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
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowSwitcher(false)}
              />
              <div 
                className="profile-popover absolute bottom-[98px] left-2 right-2 z-50 rounded-xl border p-2 shadow-2xl flex flex-col gap-1.5"
                style={{ 
                  background: theme === "dark" ? "#1b1b1f" : "#ffffff", 
                  borderColor: theme === "dark" ? "#2a2a30" : "#e4e4e7",
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
                }}
              >
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
                    Control Workspaces
                  </span>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-2)] font-data" style={{ color: "var(--text-2)" }}>
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
                            boxShadow: isActive ? "0 0 12px rgba(252, 191, 36, 0.35)" : "none",
                          }}
                        >
                          {p.initials}
                        </div>
                        <div className="flex-1 leading-tight min-w-0">
                          <div className="font-semibold truncate flex items-center gap-1.5 text-[12px]" style={{ color: isActive ? "var(--accent)" : "var(--foreground)" }}>
                            {p.name}
                          </div>
                          <div className="text-[9.5px] mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                            {ROLE_DESCRIPTIONS[p.role]}
                          </div>
                        </div>
                        {isActive && (
                          <div className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ background: "var(--accent)", boxShadow: "0 0 6px var(--accent)" }} />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1 border-t pt-1.5" style={{ borderColor: "var(--border)" }}>
                  <button
                    onClick={async () => {
                      await logoutApi();
                      navigate({ to: "/login" });
                    }}
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
                <div className="text-[11px] font-semibold truncate text-foreground">{activeProfile.name}</div>
                <div className="text-[9px] font-medium truncate" style={{ color: "var(--text-3)" }}>{activeProfile.role}</div>
              </div>
              <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${showSwitcher ? "rotate-90" : ""}`} style={{ color: "var(--text-3)" }} />
            </button>
          ) : (
            <button 
              onClick={() => setCollapsed(false)}
              className="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold mx-auto"
              style={{ background: activeProfile.color || "var(--accent)", color: "var(--accent-foreground)" }}
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
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span>Collapse</span></>}
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
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: "var(--text-3)" }} />
              <input
                placeholder="Search bookings, clients, codes…"
                value={(useRouterState({ select: (s) => s.location.search }) as any).q || ""}
                onChange={(e) => {
                  navigate({
                    to: "/bookings",
                    search: (prev: any) => ({ ...prev, q: e.target.value || undefined }),
                    replace: true,
                  });
                }}
                className="h-8 w-72 rounded-md border bg-[var(--surface-2)] pl-8 pr-3 text-[12px] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button 
              onClick={() => {
                const nextTheme = theme === "dark" ? "light" : "dark";
                setTheme(nextTheme);
                localStorage.setItem("vortex_theme", nextTheme);
                const root = document.documentElement;
                if (nextTheme === "light") {
                  root.classList.add("light");
                  root.classList.remove("dark");
                } else {
                  root.classList.add("dark");
                  root.classList.remove("light");
                }
              }} 
              aria-label="Toggle theme" 
              className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--surface-2)]" 
              style={{ borderColor: "var(--border)" }}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" style={{ color: "var(--accent)" }} /> : <Moon className="h-4 w-4" style={{ color: "var(--accent)" }} />}
            </button>
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setBellOpen(!bellOpen)}
                aria-label="Open notifications"
                className="relative flex h-8 w-8 items-center justify-center rounded-md border hover:bg-[var(--surface-2)] transition"
                style={{ borderColor: "var(--border)" }}
              >
                <Bell className="h-4 w-4" style={{ color: "var(--text-2)" }} />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full animate-ping" style={{ background: "var(--accent)" }} />
                )}
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
                )}
              </button>

              {bellOpen && (
                <>
                  {/* Backdrop to close dropdown on clicking outside */}
                  <div className="fixed inset-0 z-40 bg-transparent cursor-default" onClick={() => setBellOpen(false)} />
                  
                  {/* Dropdown panel */}
                  <div
                    className="absolute right-0 mt-2 w-80 rounded-lg border shadow-xl z-50 p-1 flex flex-col max-h-[420px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between border-b px-3.5 py-2.5" style={{ borderColor: "var(--border)" }}>
                      <span className="text-[13px] font-bold">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            markAllRead();
                            setBellOpen(false);
                          }}
                          className="text-[10px] font-semibold hover:opacity-80 transition"
                          style={{ color: "var(--accent)" }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y scrollbar-thin" style={{ borderColor: "var(--border)" }}>
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.slice(0, 5).map((n) => {
                          const isUnread = !n.readAt;
                          
                          // Redirect mapping
                          let redirectPath = "/notifications";
                          if (n.relatedEntity === "booking") {
                            redirectPath = `/bookings/${n.relatedId}`;
                          } else if (n.relatedEntity === "assignment") {
                            redirectPath = `/bookings/${n.relatedId}`;
                          } else if (n.relatedEntity === "damage_missing_report") {
                            redirectPath = `/damage-report`;
                          }

                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                navigate({ to: redirectPath as any });
                                markAsRead(n.id);
                                setBellOpen(false);
                              }}
                              className="group flex gap-2.5 p-3 text-left transition hover:bg-[var(--surface-2)] cursor-pointer"
                            >
                              <div className="mt-1 flex h-2 w-2 shrink-0 rounded-full" style={{ background: isUnread ? "var(--accent)" : "transparent" }} />
                              <div className="flex-grow min-w-0">
                                <div className="text-[12px] font-bold truncate" style={{ color: isUnread ? "var(--foreground)" : "var(--text-2)" }}>
                                  {n.title}
                                </div>
                                <div className="text-[10.5px] mt-0.5 leading-relaxed truncate" style={{ color: "var(--text-3)" }}>
                                  {n.detail || n.message}
                                </div>
                                <div className="text-[9px] font-mono mt-1" style={{ color: "var(--text-3)" }}>
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              {isUnread && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(n.id);
                                  }}
                                  className="self-center opacity-0 group-hover:opacity-100 transition rounded-md border px-1.5 py-0.5 text-[9px] font-semibold hover:border-[var(--accent)]"
                                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t p-2 text-center" style={{ borderColor: "var(--border)" }}>
                      <Link
                        to="/notifications"
                        onClick={() => setBellOpen(false)}
                        className="block w-full py-1 text-[11px] font-bold text-center hover:opacity-80 transition"
                        style={{ color: "var(--accent)" }}
                      >
                        View all notifications
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
