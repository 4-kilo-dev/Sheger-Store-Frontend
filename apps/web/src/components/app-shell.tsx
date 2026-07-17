import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarRange, Package, Users, BarChart3, Settings,
  ChevronsLeft, ChevronsRight, Search, ChevronRight,
  ClipboardCheck, ShieldAlert, LogOut, Sun, Moon, Menu, X, Trello, Truck,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useMobile } from "@/hooks/use-mobile";
import { useAuthUser } from "@/hooks/use-auth-user";
import { usePermissions } from "@/hooks/use-permissions";
import { logoutApi } from "@/features/auth/services/auth.api";
import { PERMISSION } from "@/lib/auth/permission-keys";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/operations", label: "Operations Board", icon: Trello },
  { to: "/driver-trips", label: "Driver Trips", icon: Truck },
  { to: "/bookings", label: "Bookings", icon: CalendarRange },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/checkout", label: "Check-in / out", icon: ClipboardCheck },
  { to: "/damage-report", label: "Damage reports", icon: ShieldAlert },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;



/** Nav routes gated by at least one of these permission keys (empty = always visible). */
const NAV_PERMISSIONS: Record<string, string[]> = {
  "/operations": [PERMISSION.ASSIGNMENT_ASSIGN_CREW],
  "/driver-trips": [PERMISSION.DRIVER_TRIP_VIEW],
  "/bookings": [PERMISSION.BOOKING_VIEW_ALL, PERMISSION.BOOKING_VIEW_ASSIGNED, PERMISSION.BOOKING_CREATE],
  "/inventory": [PERMISSION.INVENTORY_VIEW, PERMISSION.INVENTORY_MANAGE],
  "/checkout": [PERMISSION.INVENTORY_CHECKOUT, PERMISSION.INVENTORY_CHECKIN],
  "/damage-report": [PERMISSION.DAMAGE_REPORT],
  "/staff": [PERMISSION.USER_VIEW],
  "/reports": ["report.view", PERMISSION.EVAL_VIEW],
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  ccr: "CCR",
  chief_tech: "Chief Technician",
  technician: "Technician",
  oo: "Operations Officer",
  storekeeper: "Storekeeper",
  stagehand: "Stagehand",
  freelancer: "Freelancer",
};

function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

function formatRoleLabel(roleKey?: string): string {
  if (!roleKey) return "Staff";
  return ROLE_LABELS[roleKey.toLowerCase()] ?? roleKey.replace(/_/g, " ");
}

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
  const isMobile = useMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const authUser = useAuthUser();
  const { canAny } = usePermissions();
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const displayName = authUser?.name ?? "User";
  const displayRole = formatRoleLabel(authUser?.roles?.[0] ?? authUser?.role);
  const initials = getInitials(displayName);

  useEffect(() => {
    // Sync React state with the actual DOM on mount
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);

  // Close mobile drawer on route change
  const location = useRouterState({ select: (s) => s.location });
  const path = location.pathname;
  const searchRole = (location.search as any)?.role;

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [path, searchRole]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isMobile, mobileOpen]);

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      <SidebarLogo collapsed={isMobile ? false : collapsed} />
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
          {/* Dashboard (Home) */}
          {(() => {
            const active = path === "/" && !searchRole;
            const showLabel = isMobile ? true : !collapsed;
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
                {showLabel && <span>Dashboard</span>}
              </Link>
            );
          })()}



          {/* Other Nav Items */}
          {NAV.slice(1).map(({ to, label, icon: Icon }) => {
            const required = NAV_PERMISSIONS[to];
            const isPermitted = !required || required.length === 0 || canAny(required);
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
                {(isMobile || !collapsed) && <span>{label}</span>}
              </Link>
            );
          })}
      </nav>

        {/* Bottom section */}
      <div className="border-t p-2 relative" style={{ borderColor: "var(--border)" }}>
        {showUserMenu && (isMobile || !collapsed) && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserMenu(false)}
            />
            <div
              className="profile-popover absolute bottom-[98px] left-2 right-2 z-50 rounded-xl border p-2 shadow-2xl"
              style={{
                background: theme === "dark" ? "#1b1b1f" : "#ffffff",
                borderColor: theme === "dark" ? "#2a2a30" : "#e4e4e7",
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)",
              }}
            >
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
          </>
        )}

        {(isMobile || !collapsed) ? (
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="mb-2 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-all duration-150 border"
            style={{
              borderColor: showUserMenu ? "var(--accent)" : "var(--border)",
              background: showUserMenu ? "var(--surface-2)" : "transparent",
            }}
          >
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              {initials}
            </div>
            <div className="flex-1 leading-tight min-w-0">
              <div className="text-[11px] font-semibold truncate text-foreground">{displayName}</div>
              <div className="text-[9px] font-medium truncate" style={{ color: "var(--text-3)" }}>{displayRole}</div>
            </div>
            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${showUserMenu ? "rotate-90" : ""}`} style={{ color: "var(--text-3)" }} />
          </button>
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="mb-2 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold mx-auto"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            title={displayName}
          >
            {initials}
          </button>
        )}
        
        {!isMobile && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-[12px] font-medium transition hover:bg-[var(--surface-2)]"
            style={{ color: "var(--text-2)" }}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span>Collapse</span></>}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      {/* Mobile Sidebar Drawer */}
      {isMobile && mobileOpen && (
        <>
          <div 
            className="mobile-drawer-backdrop fixed inset-0 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="mobile-drawer fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className="fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-200"
          style={{ width: collapsed ? 64 : 240, background: "var(--surface)", borderColor: "var(--border)" }}
        >
          {sidebarContent}
        </aside>
      )}

      {/* Main */}
      {/* Main */}
      <div className="flex flex-1 flex-col" style={{ marginLeft: isMobile ? 0 : (collapsed ? 64 : 240) }}>
        <header
          className="sticky top-0 z-20 flex h-14 items-center justify-between border-b px-3 md:px-6"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-md border transition hover:bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)" }}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" style={{ color: "var(--text-2)" }} />
              </button>
            )}
            <Breadcrumb />
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
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
              suppressHydrationWarning
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
              <span suppressHydrationWarning className="flex items-center justify-center">
                {theme === "dark" ? <Sun className="h-4 w-4" style={{ color: "var(--accent)" }} /> : <Moon className="h-4 w-4" style={{ color: "var(--accent)" }} />}
              </span>
            </button>

          </div>
        </header>
        <main className="flex-1 p-3 md:p-6">{children}</main>
      </div>
    </div>
  );
}
