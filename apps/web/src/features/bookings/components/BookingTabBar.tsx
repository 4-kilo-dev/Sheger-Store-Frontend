import { TABS, type TabName } from "@/features/bookings/constants";

interface BookingTabBarProps {
  isTechnician: boolean;
  tab: TabName;
  setTab: (tab: TabName) => void;
}

export function BookingTabBar({ isTechnician, tab, setTab }: BookingTabBarProps) {
  const visibleTabs = isTechnician
    ? TABS.filter((t) => t !== "Payments" && t !== "Schedule" && t !== "Team")
    : TABS;

  return (
    <div
      className="mb-4 flex items-center gap-1 border-b"
      style={{ borderColor: "var(--border)" }}
    >
      {visibleTabs.map((t) => {
        const active = tab === t;
        return (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-4 py-2.5 text-[12px] font-semibold transition"
            style={{ color: active ? "var(--foreground)" : "var(--text-2)" }}
          >
            {t}
            {active && (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
