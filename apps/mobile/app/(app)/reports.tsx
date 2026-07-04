import {
  Banknote,
  BarChart3,
  CalendarCheck,
  Download,
  Gauge,
  PieChart,
  TrendingUp,
  Users,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  ProgressBar,
  Screen,
  Section,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import { BOOKINGS, INVENTORY, MONTHS, STAFF } from "@/data/mock";
import { colors } from "@/theme/tokens";
import { STATUS_LABELS, STATUS_ORDER } from "@/types/domain";
import { formatCompactCurrency, formatCurrency, pct } from "@/utils/format";

const PERIODS = ["month", "quarter", "year"] as const;

export default function ReportsScreen() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("month");
  const stats = useMemo(() => {
    const totalRevenue = BOOKINGS.reduce((sum, booking) => sum + booking.amount, 0);
    const completedJobs = BOOKINGS.filter(
      (booking) => booking.status === "COMPLETED" || booking.status === "DONE",
    ).length;
    const totalInventory = INVENTORY.reduce((sum, item) => sum + item.total, 0);
    const available = INVENTORY.reduce((sum, item) => sum + item.available, 0);
    return {
      totalRevenue,
      completedJobs,
      utilization: pct(totalInventory - available, totalInventory),
      avgJobValue: Math.round(totalRevenue / BOOKINGS.length / 1000),
    };
  }, []);
  const maxRevenue = Math.max(...MONTHS.map((month) => month.revenue));

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Business Intelligence</AppText>
        <AppText variant="title">Operations Reports</AppText>
        <AppText variant="subtitle">
          A consolidated view of booking volume, collections, stock use, and crew output.
        </AppText>
      </View>
      <SegmentedTabs tabs={PERIODS} value={period} onChange={setPeriod} />
      <View style={{ gap: 12 }}>
        <StatCard
          label="Booked Revenue"
          value={formatCompactCurrency(stats.totalRevenue)}
          note="+14.2% vs last month"
          icon={Banknote}
        />
        <StatCard
          label="Completed Jobs"
          value={stats.completedJobs}
          note={`${pct(stats.completedJobs, BOOKINGS.length)}% completion rate`}
          icon={CalendarCheck}
        />
        <StatCard
          label="Fleet Utilization"
          value={`${stats.utilization}%`}
          note="LED cabinet fleet"
          icon={Gauge}
        />
        <StatCard
          label="Avg. Job Value"
          value={`${stats.avgJobValue}K`}
          note="+6.8% this quarter"
          icon={TrendingUp}
        />
      </View>
      <Section title="Revenue Trend" icon={BarChart3} aside="Last 6 months">
        <View style={styles.chart}>
          {MONTHS.map((month) => (
            <View key={month.m} style={styles.barWrap}>
              <View
                style={[styles.bar, { height: Math.max(20, (month.revenue / maxRevenue) * 190) }]}
              />
              <AppText variant="small" style={{ fontWeight: "800" }}>
                {month.m}
              </AppText>
              <AppText variant="data" color={colors.text3}>
                {month.bookings}
              </AppText>
            </View>
          ))}
        </View>
      </Section>
      <Section title="Equipment Utilization" icon={Gauge} aside="Current">
        {[
          { name: "P2.97 New", used: 64, total: 192 },
          { name: "P3.91 Outdoor", used: 68, total: 144 },
          { name: "P4 Cabinets", used: 74, total: 96 },
          { name: "Novastar Proc.", used: 5, total: 12 },
          { name: "Generators", used: 2, total: 3 },
        ].map((item) => {
          const value = pct(item.used, item.total);
          return (
            <View key={item.name} style={{ gap: 7 }}>
              <View style={styles.lineTop}>
                <AppText style={{ fontWeight: "800" }}>{item.name}</AppText>
                <AppText variant="data" style={{ fontWeight: "900" }}>
                  {value}%
                </AppText>
              </View>
              <ProgressBar
                value={value}
                tone={
                  value > 80
                    ? colors.destructive
                    : value > 60
                      ? colors.payment.ADVANCE
                      : colors.accent
                }
              />
              <AppText variant="data" color={colors.text3}>
                {item.used} used / {item.total} total
              </AppText>
            </View>
          );
        })}
      </Section>
      <Section title="Booking Status Distribution" icon={PieChart}>
        {STATUS_ORDER.map((status) => {
          const count = BOOKINGS.filter((booking) => booking.status === status).length;
          return (
            <View key={status} style={styles.lineTop}>
              <AppText variant="eyebrow" color={colors.status[status]}>
                {STATUS_LABELS[status]}
              </AppText>
              <AppText variant="data" color={colors.status[status]} style={{ fontWeight: "900" }}>
                {count}
              </AppText>
            </View>
          );
        })}
      </Section>
      <Section title="Payment Collection Summary" icon={Banknote}>
        {(["PAID", "ADVANCE", "UNPAID"] as const).map((payment) => {
          const data = BOOKINGS.filter((booking) => booking.payment === payment);
          return (
            <View key={payment} style={styles.lineTop}>
              <AppText variant="eyebrow" color={colors.payment[payment]}>
                {payment}
              </AppText>
              <AppText variant="data">
                {data.length} ·{" "}
                {formatCurrency(data.reduce((sum, booking) => sum + booking.amount, 0))}
              </AppText>
            </View>
          );
        })}
      </Section>
      <Section title="Crew Performance" icon={Users} aside="This quarter">
        {STAFF.slice(0, 6).map((staff) => (
          <View key={staff.name} style={{ gap: 6 }}>
            <View style={styles.lineTop}>
              <View>
                <AppText style={{ fontWeight: "800" }}>{staff.name}</AppText>
                <AppText variant="small" color={colors.text2}>
                  {staff.role}
                </AppText>
              </View>
              <AppText variant="data">
                {staff.jobs}/{staff.capacity}
              </AppText>
            </View>
            <ProgressBar value={pct(staff.jobs, staff.capacity)} />
          </View>
        ))}
      </Section>
      <Section title="Export operational report" icon={Download}>
        <AppText variant="subtitle">
          Generate a booking, payment, inventory, or team performance report.
        </AppText>
        <Button variant="outline" icon={Download}>
          Export CSV
        </Button>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 250,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingLeft: 8,
    paddingBottom: 8,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  bar: {
    width: "100%",
    backgroundColor: colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  lineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
});
