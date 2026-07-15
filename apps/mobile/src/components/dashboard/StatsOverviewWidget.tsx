import { CalendarRange, Clock, DollarSign, Package, TrendingUp, Users } from "lucide-react-native";
import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { StatCard } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { useBookings, useStaff } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import { formatCompactCurrency } from "@/utils/format";

export function StatsOverviewWidget() {
  const { activeProfile } = useAppContext();
  const role = activeProfile.role;
  const { data: BOOKINGS = [] } = useBookings();
  const { data: STAFF = [] } = useStaff();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = BOOKINGS.filter((booking) => {
      const date = new Date(booking.eventDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const revenue = thisMonth.reduce((sum, booking) => sum + booking.amount, 0);
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
    const assignedToMe = BOOKINGS.filter(
      (booking) =>
        booking.status === "ASSIGNED" &&
        booking.assignees.some((name) => activeProfile.name.startsWith(name)),
    ).length;
    const inPrep = BOOKINGS.filter((booking) => booking.status === "PREPARATION").length;
    const availableStaff = STAFF.filter((member) => member.status === "ACTIVE").length;
    return {
      thisMonth: thisMonth.length,
      revenue,
      onsite: onsite.length,
      upcoming: upcoming.length,
      paid,
      reserved,
      unpaid,
      confirmed,
      assigned,
      assignedToMe,
      inPrep,
      availableStaff,
    };
  }, [activeProfile.name, BOOKINGS, STAFF]);

  const cards = useMemo(() => {
    if (role === "CCR") {
      return [
        {
          label: "Reserved",
          value: stats.reserved,
          note: "Awaiting confirmation",
          icon: CalendarRange,
        },
        {
          label: "Unpaid / Advance",
          value: stats.unpaid,
          note: "Needs follow-up",
          icon: DollarSign,
          tone: colors.destructive,
        },
        { label: "Confirmed", value: stats.confirmed, note: "Ready for tech review", icon: Clock },
      ];
    }
    if (role === "CTO") {
      return [
        {
          label: "Confirmed",
          value: stats.confirmed,
          note: "Awaiting crew assignment",
          icon: CalendarRange,
        },
        { label: "Assigned", value: stats.assigned, note: "Awaiting acceptance", icon: Users },
        { label: "In preparation", value: stats.inPrep, note: "BOM in progress", icon: Package },
      ];
    }
    if (role === "TO") {
      return [
        {
          label: "Assigned to you",
          value: stats.assignedToMe,
          note: "Waiting for acceptance",
          icon: CalendarRange,
        },
        { label: "In preparation", value: stats.inPrep, note: "BOM and drawings", icon: Package },
      ];
    }
    if (role === "OO") {
      return [
        { label: "In preparation", value: stats.inPrep, note: "Ready for dispatch", icon: Package },
        {
          label: "Screens onsite",
          value: stats.onsite,
          note: "Active right now",
          icon: Package,
          tone: colors.status.ACCEPTED,
        },
        {
          label: "Available staff",
          value: stats.availableStaff,
          note: "Ready for assignment",
          icon: Users,
        },
      ];
    }
    if (role === "SK") {
      return [
        { label: "Ready for checkout", value: stats.inPrep, note: "BOM verified", icon: Package },
        {
          label: "Screens onsite",
          value: stats.onsite,
          note: "Active right now",
          icon: Package,
          tone: colors.status.ACCEPTED,
        },
      ];
    }
    return [
      {
        label: "Bookings this month",
        value: stats.thisMonth,
        note: `${stats.paid} paid`,
        icon: CalendarRange,
      },
      {
        label: "Revenue",
        value: formatCompactCurrency(stats.revenue),
        note: "+14.2% from last month",
        icon: TrendingUp,
        tone: colors.success,
      },
      {
        label: "Screens onsite",
        value: stats.onsite,
        note: "Active right now",
        icon: Package,
        tone: colors.status.ACCEPTED,
      },
      {
        label: "Assemblies this week",
        value: stats.upcoming,
        note: "Next 7 days",
        icon: Clock,
        tone: colors.payment.ADVANCE,
      },
    ];
  }, [role, stats]);

  return (
    <View style={styles.grid}>
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 12,
  },
});
