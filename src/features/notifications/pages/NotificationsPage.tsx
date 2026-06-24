import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell, CalendarCheck, CheckCheck, DollarSign, Package, ShieldAlert,
  SlidersHorizontal, AlertTriangle, Settings, ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { NOTIFICATIONS, type NotificationType, type NotificationPriority } from "@/features/checkout/services/operations.api";

const _Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications · Vortex Visual" },
      { name: "description", content: "Operational alerts and activity notifications." },
    ],
  }),
  component: NotificationsPage,
});

const TABS = ["All", "Unread", "Booking", "Inventory", "Payment", "Schedule"] as const;
type TabKey = (typeof TABS)[number];

const TYPE_ICONS: Record<NotificationType, any> = {
  Booking: CalendarCheck,
  Inventory: Package,
  Payment: DollarSign,
  Damage: ShieldAlert,
  Schedule: CalendarCheck,
  System: Settings,
};

const PRIORITY_STYLES: Record<NotificationPriority, { color: string; bg: string }> = {
  URGENT: { color: "var(--destructive)", bg: "color-mix(in oklab, var(--destructive) 14%, transparent)" },
  NORMAL: { color: "var(--accent)", bg: "color-mix(in oklab, var(--accent) 10%, transparent)" },
  LOW: { color: "var(--text-3)", bg: "var(--surface-2)" },
};

export function NotificationsPage() {
  const [tab, setTab] = useState<TabKey>("All");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let items = [...NOTIFICATIONS];
    if (tab === "Unread") items = items.filter((n) => n.unread && !readIds.has(n.id));
    else if (tab !== "All") items = items.filter((n) => n.type === tab);
    return items;
  }, [tab, readIds]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = { Today: [], Yesterday: [], "This Week": [] };
    filtered.forEach((n) => {
      if (groups[n.date]) groups[n.date].push(n);
    });
    return groups;
  }, [filtered]);

  const markAllRead = () => {
    setReadIds(new Set(NOTIFICATIONS.map((n) => n.id)));
  };

  const toggleRead = (id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread && !readIds.has(n.id)).length;

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-1">Activity Center</div>
          <h1 className="text-[24px] font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-[12px] text-text-2">Prioritized booking, warehouse, payment, and schedule alerts.</p>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: "color-mix(in oklab, var(--accent) 16%, transparent)", color: "var(--accent)" }}>
            {unreadCount} unread
          </span>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        {/* Main list */}
        <section className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {/* Tabs */}
          <div className="flex items-center justify-between border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
            <div className="flex gap-1">
              {TABS.map((t) => {
                const active = tab === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="relative rounded-md px-3 py-1.5 text-[11px] font-semibold transition"
                    style={{
                      background: active ? "var(--surface-2)" : "transparent",
                      color: active ? "var(--foreground)" : "var(--text-2)",
                    }}
                  >
                    {t}
                    {t === "Unread" && unreadCount > 0 && (
                      <span className="ml-1 rounded-full px-1.5 text-[9px] font-bold" style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}>
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition hover:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>

          {/* Grouped notifications */}
          {Object.entries(grouped).map(([group, items]) =>
            items.length > 0 ? (
              <div key={group}>
                <div className="border-b px-4 py-2" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{group}</span>
                </div>
                {items.map((n) => {
                  const Icon = TYPE_ICONS[n.type] || Bell;
                  const isUnread = n.unread && !readIds.has(n.id);
                  const pStyle = PRIORITY_STYLES[n.priority];
                  return (
                    <div
                      key={n.id}
                      className="flex gap-4 border-b p-4 transition hover:bg-[var(--surface-2)] last:border-0"
                      style={{
                        borderColor: "var(--border)",
                        background: isUnread ? "color-mix(in oklab, var(--accent) 3%, transparent)" : "transparent",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: isUnread ? "var(--accent)" : "var(--surface-2)",
                          color: isUnread ? "var(--accent-foreground)" : "var(--text-2)",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h2 className="truncate text-[13px] font-semibold">{n.title}</h2>
                            {n.priority !== "NORMAL" && (
                              <span
                                className="shrink-0 rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider"
                                style={{ color: pStyle.color, background: pStyle.bg }}
                              >
                                {n.priority}
                              </span>
                            )}
                          </div>
                          <time className="shrink-0 text-[10px] font-mono" style={{ color: "var(--text-3)" }}>{n.time}</time>
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{n.detail}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span
                            className="rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
                          >
                            {n.type}
                          </span>
                          {n.linkTo && (
                            <Link
                              to={n.linkTo}
                              className="flex items-center gap-1 text-[10px] font-semibold"
                              style={{ color: "var(--accent)" }}
                            >
                              View details <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          <button
                            onClick={() => toggleRead(n.id)}
                            className="ml-auto text-[10px] font-semibold"
                            style={{ color: "var(--text-3)" }}
                          >
                            {isUnread ? "Mark read" : "Mark unread"}
                          </button>
                        </div>
                      </div>
                      {isUnread && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : null,
          )}

          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <Bell className="mx-auto h-8 w-8" style={{ color: "var(--text-3)" }} />
              <p className="mt-3 text-[13px] font-semibold">No notifications</p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--text-3)" }}>You're all caught up.</p>
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" style={{ color: "var(--accent)" }} />
              <h2 className="text-[13px] font-bold">Alert routing</h2>
            </div>
            <p className="mt-2 text-[11px] leading-5" style={{ color: "var(--text-2)" }}>
              Critical stock, damage, and onsite alerts are pinned. Payment and assignment updates follow your selected role.
            </p>
            <Link
              to="/settings"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border py-2 text-[11px] font-semibold transition hover:border-[var(--accent)]"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              Notification Settings
            </Link>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[12px] font-bold">Summary</h2>
            <div className="mt-3 space-y-2">
              {[
                { label: "Total", value: NOTIFICATIONS.length },
                { label: "Unread", value: unreadCount, color: "var(--accent)" },
                { label: "Urgent", value: NOTIFICATIONS.filter((n) => n.priority === "URGENT").length, color: "var(--destructive)" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between text-[11px]">
                  <span style={{ color: "var(--text-2)" }}>{label}</span>
                  <span className="font-mono font-bold" style={{ color: color || "var(--foreground)" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-[12px] font-bold">By Type</h2>
            <div className="mt-3 space-y-2">
              {(["Booking", "Inventory", "Payment", "Damage", "Schedule", "System"] as NotificationType[]).map((type) => {
                const count = NOTIFICATIONS.filter((n) => n.type === type).length;
                const Icon = TYPE_ICONS[type];
                return (
                  <button
                    key={type}
                    onClick={() => setTab(type === "Booking" || type === "Inventory" || type === "Payment" || type === "Schedule" ? type as TabKey : "All")}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] transition hover:bg-[var(--surface-2)]"
                  >
                    <span className="flex items-center gap-1.5" style={{ color: "var(--text-2)" }}>
                      <Icon className="h-3 w-3" /> {type}
                    </span>
                    <span className="font-mono font-semibold">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}