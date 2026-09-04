import {
  CalendarRange,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { to } from "@/utils/routes";
import { StatCard } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { useSystemCurrency } from "@/hooks/use-system-currency";
import { useBookings, useInventory } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import { useCalendarSystem, type CalendarSystem } from "@/context/CalendarSystemContext";

function calendarYearMonth(date: Date, calendarSystem: CalendarSystem) {
  if (calendarSystem === "ethiopic") {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-ethiopic", {
      year: "numeric",
      month: "numeric",
    }).formatToParts(date);
    return {
      year: Number(parts.find((part) => part.type === "year")?.value),
      month: Number(parts.find((part) => part.type === "month")?.value),
    };
  }
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function previousCalendarMonth(year: number, month: number, calendarSystem: CalendarSystem) {
  const monthCount = calendarSystem === "ethiopic" ? 13 : 12;
  return month === 1 ? { year: year - 1, month: monthCount } : { year, month: month - 1 };
}

function namesMatch(assignee: string, profileName: string) {
  const a = assignee.trim().toLowerCase();
  const p = profileName.trim().toLowerCase();
  return a === p || a.startsWith(p) || p.startsWith(a);
}

type DashboardBookingTab = "This Month" | "This Week" | "Onsite";

type DashboardCard = {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone?: string;
  href: string;
  bookingTab?: DashboardBookingTab;
};

export function StatsOverviewWidget() {
  const { activeProfile } = useAppContext();
  const role = activeProfile.role;
  const { formatMoneyCompact } = useSystemCurrency();
  const { calendarSystem } = useCalendarSystem();
  const { data: BOOKINGS = [] } = useBookings();
  const { data: INVENTORY = [] } = useInventory();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = calendarYearMonth(now, calendarSystem);
    const previousMonth = previousCalendarMonth(
      currentMonth.year,
      currentMonth.month,
      calendarSystem,
    );
    const thisMonth = BOOKINGS.filter((booking) => {
      const date = calendarYearMonth(new Date(booking.eventDate), calendarSystem);
      return date.year === currentMonth.year && date.month === currentMonth.month;
    });
    const lastMonth = BOOKINGS.filter((booking) => {
      const date = calendarYearMonth(new Date(booking.eventDate), calendarSystem);
      return date.year === previousMonth.year && date.month === previousMonth.month;
    });
    const revenue = thisMonth.reduce((sum, booking) => sum + booking.amount, 0);
    const lastMonthRevenue = lastMonth.reduce((sum, booking) => sum + booking.amount, 0);
    const revenueChangePct =
      lastMonthRevenue > 0 ? ((revenue - lastMonthRevenue) / lastMonthRevenue) * 100 : null;
    const onsite = BOOKINGS.filter((booking) => booking.status === "ONSITE");
    const upcoming = BOOKINGS.filter((booking) => {
      const date = new Date(booking.assemblyDate);
      const diff = (date.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    });
    const paid = BOOKINGS.filter((booking) => booking.payment === "PAID").length;
    const reserved = BOOKINGS.filter((booking) => booking.status === "RESERVED").length;
    const unpaid = BOOKINGS.filter(
      (booking) => booking.payment === "UNPAID" || booking.payment === "ADVANCE",
    ).length;
    const confirmed = BOOKINGS.filter((booking) => booking.status === "CONFIRMED").length;
    const assigned = BOOKINGS.filter((booking) => booking.status === "ASSIGNED").length;
    const assignedToMe = BOOKINGS.filter((booking) =>
      booking.assignees.some((name) => namesMatch(name, activeProfile.name)),
    ).filter((booking) => booking.status === "ASSIGNED").length;
    const inPrep = BOOKINGS.filter((booking) => booking.status === "PREPARATION").length;
    const completed = BOOKINGS.filter(
      (booking) => booking.status === "COMPLETED" || booking.status === "PARTIALLY_RETURNED",
    ).length;
    const mealBudgetsActive = BOOKINGS.filter(
      (booking) => booking.status === "ONSITE" && Number(booking.mealBudget || 0) > 0,
    ).length;
    const inventoryDamaged = INVENTORY.reduce((sum, item) => sum + (item.damaged || 0), 0);
    return {
      thisMonth: thisMonth.length,
      revenue,
      revenueChangePct,
      onsite: onsite.length,
      upcoming: upcoming.length,
      paid,
      reserved,
      unpaid,
      confirmed,
      assigned,
      assignedToMe,
      inPrep,
      completed,
      mealBudgetsActive,
      inventoryDamaged,
    };
  }, [activeProfile.name, BOOKINGS, INVENTORY, calendarSystem]);

  const cards = useMemo<DashboardCard[]>(() => {
    if (role === "CCR") {
      return [
        {
          label: "Reserved",
          value: stats.reserved,
          note: "Need confirming",
          icon: CalendarRange,
          href: "/bookings",
        },
        {
          label: "Unpaid / Advance",
          value: stats.unpaid,
          note: "Follow up",
          icon: DollarSign,
          tone: colors.destructive,
          href: "/bookings",
        },
        {
          label: "Confirmed",
          value: stats.confirmed,
          note: "Waiting assignment",
          icon: Clock,
          href: "/bookings",
        },
      ];
    }
    if (role === "CTO") {
      return [
        {
          label: "Confirmed",
          value: stats.confirmed,
          note: "Assign crew",
          icon: CalendarRange,
          href: "/bookings",
        },
        {
          label: "Assigned",
          value: stats.assigned,
          note: "Awaiting accept",
          icon: Users,
          href: "/bookings",
        },
        {
          label: "In preparation",
          value: stats.inPrep,
          note: "BOM in progress",
          icon: Package,
          href: "/bookings",
        },
      ];
    }
    if (role === "TO" || role === "SH" || role === "FL") {
      return [
        {
          label: "Assigned to you",
          value: stats.assignedToMe,
          note: "Accept these",
          icon: CalendarRange,
          href: "/bookings",
        },
        {
          label: "In preparation",
          value: stats.inPrep,
          note: "BOM and drawings",
          icon: Package,
          href: "/bookings",
        },
      ];
    }
    if (role === "OO") {
      return [
        {
          label: "In preparation",
          value: stats.inPrep,
          note: "Ready to dispatch",
          icon: Package,
          href: "/operations",
        },
        {
          label: "Onsite",
          value: stats.onsite,
          note: "Live now",
          icon: Package,
          tone: colors.status.ACCEPTED,
          href: "/bookings",
        },
        {
          label: "Meal budgets",
          value: stats.mealBudgetsActive,
          note: "Onsite provision",
          icon: DollarSign,
          href: "/operations",
        },
      ];
    }
    if (role === "SK") {
      return [
        {
          label: "Materials out",
          value: stats.onsite,
          note: "Active check-outs",
          icon: Package,
          href: "/checkout",
        },
        {
          label: "Pending return",
          value: stats.completed,
          note: "Ready to check in",
          icon: Package,
          href: "/checkout",
        },
        {
          label: "Damaged units",
          value: stats.inventoryDamaged,
          note: "Needs a look",
          icon: Package,
          tone: colors.destructive,
          href: "/inventory",
        },
      ];
    }
    return [
      {
        label: "This month",
        value: stats.thisMonth,
        note: `${stats.paid} paid`,
        icon: CalendarRange,
        href: "/bookings",
        bookingTab: "This Month",
      },
      {
        label: "Revenue",
        value: formatMoneyCompact(stats.revenue),
        note:
          stats.revenueChangePct === null
            ? "No prior month"
            : `${stats.revenueChangePct >= 0 ? "+" : ""}${stats.revenueChangePct.toFixed(0)}% vs last month`,
        icon: TrendingUp,
        tone:
          stats.revenueChangePct !== null && stats.revenueChangePct < 0
            ? colors.destructive
            : colors.success,
        href: "/reports",
      },
      {
        label: "Onsite",
        value: stats.onsite,
        note: "Live now",
        icon: Package,
        tone: colors.status.ACCEPTED,
        href: "/bookings",
        bookingTab: "Onsite",
      },
      {
        label: "This week",
        value: stats.upcoming,
        note: "Assemblies in 7 days",
        icon: Clock,
        tone: colors.payment.ADVANCE,
        href: "/bookings",
        bookingTab: "This Week",
      },
    ];
  }, [formatMoneyCompact, role, stats]);

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <Pressable
          key={card.label}
          accessibilityRole="button"
          accessibilityLabel={`${card.label}: ${card.value}`}
          onPress={() =>
            router.push(
              to(
                card.bookingTab
                  ? `${card.href}?tab=${encodeURIComponent(card.bookingTab)}`
                  : card.href,
              ),
            )
          }
          style={({ pressed }) => [styles.statTile, pressed ? styles.statTilePressed : null]}
        >
          <StatCard
            label={card.label}
            value={card.value}
            note={card.note}
            icon={card.icon}
            tone={card.tone}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statTile: {
    width: "47%",
    flexGrow: 1,
  },
  statTilePressed: {
    opacity: 0.72,
  },
});
