import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarCheck,
  Download,
  Gauge,
  PieChart,
  Users,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  AppText,
  Button,
  ErrorState,
  LoadingState,
  ProgressBar,
  Screen,
  Section,
  SegmentedTabs,
  StatCard,
} from "@/components/ui";
import { useBookings, useInventory, useStaff } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import { STATUS_LABELS, STATUS_ORDER } from "@/types/domain";
import type { Booking, InventoryItem, StaffMember } from "@/types/domain";
import { formatCompactCurrency, formatCurrency, pct } from "@/utils/format";

const TABS = [
  "Revenue & Bookings",
  "Inventory Health",
  "Client Directory",
  "Quality & Crew",
  "Audit Logs",
] as const;

function monthsFromBookings(bookings: Booking[]) {
  const now = new Date();
  const buckets: { m: string; revenue: number; bookings: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleDateString(undefined, { month: "short" });
    const inMonth = bookings.filter((booking) => {
      const eventDate = new Date(booking.eventDate);
      return (
        eventDate.getMonth() === date.getMonth() && eventDate.getFullYear() === date.getFullYear()
      );
    });
    buckets.push({
      m: label,
      revenue: inMonth.reduce((sum, booking) => sum + booking.amount, 0),
      bookings: inMonth.length,
    });
  }
  return buckets;
}

export default function ReportsScreen() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Revenue & Bookings");
  const bookingsQuery = useBookings();
  const inventoryQuery = useInventory();
  const staffQuery = useStaff();

  const isLoading = bookingsQuery.isLoading || inventoryQuery.isLoading || staffQuery.isLoading;
  const isError = bookingsQuery.isError || inventoryQuery.isError || staffQuery.isError;

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading reports..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState
          detail="Could not load report data from the server."
          onRetry={() => {
            bookingsQuery.refetch();
            inventoryQuery.refetch();
            staffQuery.refetch();
          }}
        />
      </Screen>
    );
  }

  const BOOKINGS = bookingsQuery.data ?? [];
  const INVENTORY = inventoryQuery.data ?? [];
  const STAFF = staffQuery.data ?? [];

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Business Intelligence</AppText>
        <AppText variant="title">Operations Reports</AppText>
        <AppText variant="subtitle">
          A consolidated view of booking volume, collections, stock use, and crew output.
        </AppText>
      </View>
      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === "Revenue & Bookings" ? (
        <RevenueBookingsTab BOOKINGS={BOOKINGS} INVENTORY={INVENTORY} />
      ) : null}
      {tab === "Inventory Health" ? <InventoryHealthTab INVENTORY={INVENTORY} /> : null}
      {tab === "Client Directory" ? <ClientDirectoryTab BOOKINGS={BOOKINGS} /> : null}
      {tab === "Quality & Crew" ? <QualityCrewTab STAFF={STAFF} /> : null}
      {tab === "Audit Logs" ? <AuditLogsTab BOOKINGS={BOOKINGS} /> : null}
    </Screen>
  );
}

function RevenueBookingsTab({
  BOOKINGS,
  INVENTORY,
}: {
  BOOKINGS: Booking[];
  INVENTORY: InventoryItem[];
}) {
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
      avgJobValue: BOOKINGS.length ? Math.round(totalRevenue / BOOKINGS.length / 1000) : 0,
    };
  }, [BOOKINGS, INVENTORY]);
  const MONTHS = useMemo(() => monthsFromBookings(BOOKINGS), [BOOKINGS]);
  const maxRevenue = Math.max(1, ...MONTHS.map((month) => month.revenue));

  return (
    <>
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
          icon={Banknote}
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
      <Section title="Export operational report" icon={Download}>
        <AppText variant="subtitle">
          Generate a booking, payment, inventory, or team performance report.
        </AppText>
        <Button variant="outline" icon={Download}>
          Export Revenue & Bookings CSV
        </Button>
      </Section>
    </>
  );
}

function InventoryHealthTab({ INVENTORY }: { INVENTORY: InventoryItem[] }) {
  const categories = useMemo(() => {
    const byCategory = new Map<string, InventoryItem[]>();
    for (const item of INVENTORY) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return Array.from(byCategory.entries()).map(([category, items]) => {
      const total = items.reduce((sum, item) => sum + item.total, 0);
      const available = items.reduce((sum, item) => sum + item.available, 0);
      const onsite = items.reduce((sum, item) => sum + item.onsite, 0);
      const damaged = items.reduce((sum, item) => sum + item.damaged, 0);
      return { category, total, available, onsite, damaged };
    });
  }, [INVENTORY]);

  return (
    <View style={{ gap: 12 }}>
      {categories.map((c) => {
        const availPct = pct(c.available, c.total);
        const onsitePct = pct(c.onsite, c.total);
        const damagedPct = pct(c.damaged, c.total);
        return (
          <Section key={c.category} title={c.category} icon={Gauge} aside={`${c.total} total`}>
            <View style={styles.healthBar}>
              <View
                style={[
                  styles.healthSegment,
                  { flex: Math.max(availPct, 0.001), backgroundColor: colors.success },
                ]}
              />
              <View
                style={[
                  styles.healthSegment,
                  { flex: Math.max(onsitePct, 0.001), backgroundColor: colors.status.ACCEPTED },
                ]}
              />
              <View
                style={[
                  styles.healthSegment,
                  { flex: Math.max(damagedPct, 0.001), backgroundColor: colors.destructive },
                ]}
              />
            </View>
            <View style={styles.healthLegendRow}>
              <LegendDot label={`Available ${c.available}`} tone={colors.success} />
              <LegendDot label={`Onsite ${c.onsite}`} tone={colors.status.ACCEPTED} />
              <LegendDot label={`Damaged ${c.damaged}`} tone={colors.destructive} />
            </View>
          </Section>
        );
      })}
    </View>
  );
}

function LegendDot({ label, tone }: { label: string; tone: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tone }} />
      <AppText variant="small" color={colors.text2}>
        {label}
      </AppText>
    </View>
  );
}

function ClientDirectoryTab({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const clients = useMemo(() => {
    const byClient = new Map<string, { bookings: number; completed: number; revenue: number }>();
    for (const booking of BOOKINGS) {
      const entry = byClient.get(booking.client) ?? { bookings: 0, completed: 0, revenue: 0 };
      entry.bookings += 1;
      if (booking.status === "COMPLETED" || booking.status === "DONE") entry.completed += 1;
      entry.revenue += booking.amount;
      byClient.set(booking.client, entry);
    }
    return Array.from(byClient.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [BOOKINGS]);

  return (
    <Section title="Repeat clients & lifetime valuations" icon={Users}>
      <View style={{ gap: 14 }}>
        {clients.map((client) => (
          <View key={client.name} style={{ gap: 4 }}>
            <View style={styles.lineTop}>
              <AppText style={{ fontWeight: "800" }}>{client.name}</AppText>
              {client.bookings >= 5 ? (
                <View style={styles.repeatBadge}>
                  <AppText variant="small" color={colors.accent} style={{ fontWeight: "800" }}>
                    Repeat Client
                  </AppText>
                </View>
              ) : null}
            </View>
            <View style={styles.lineTop}>
              <AppText variant="small" color={colors.text2}>
                {client.bookings} bookings · {client.completed} completed
              </AppText>
              <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                {formatCurrency(client.revenue)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

function QualityCrewTab({ STAFF }: { STAFF: StaffMember[] }) {
  return (
    <Section title="Crew Performance" icon={Users} aside="This quarter">
      {STAFF.map((staff) => (
        <View key={staff.id} style={{ gap: 6 }}>
          <View style={styles.lineTop}>
            <View>
              <AppText style={{ fontWeight: "800" }}>{staff.name}</AppText>
              <AppText variant="small" color={colors.text2}>
                {staff.role} · {staff.team}
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
  );
}

function AuditLogsTab({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return BOOKINGS.filter((booking) => {
      const date = new Date(booking.assemblyDate);
      const diff = (date.getTime() - now.getTime()) / 86400000;
      return diff >= 0 && diff <= 7;
    }).sort((a, b) => a.assemblyDate.localeCompare(b.assemblyDate));
  }, [BOOKINGS]);

  const canceled = BOOKINGS.filter((booking) => booking.status === "CANCELED");

  return (
    <>
      <Section
        title="Canceled Bookings Audit Log"
        icon={AlertTriangle}
        aside={`${canceled.length} canceled`}
      >
        {canceled.length === 0 ? (
          <AppText variant="subtitle">No cancellations recorded in the current period.</AppText>
        ) : (
          <View style={{ gap: 10 }}>
            {canceled.map((booking) => (
              <View key={booking.code} style={styles.lineTop}>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {booking.code}
                </AppText>
                <AppText variant="small" color={colors.text2}>
                  {booking.client}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Section>
      <Section title="Upcoming Operations" icon={CalendarCheck} aside="Next 7 days">
        {upcoming.length === 0 ? (
          <AppText variant="subtitle">Nothing scheduled to assemble in the next 7 days.</AppText>
        ) : (
          <View style={{ gap: 10 }}>
            {upcoming.map((booking) => (
              <View key={booking.code} style={styles.lineTop}>
                <View>
                  <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                    {booking.code}
                  </AppText>
                  <AppText variant="small" color={colors.text2}>
                    {booking.client} · {booking.venue}
                  </AppText>
                </View>
                <AppText variant="data" color={colors.text3}>
                  {booking.assemblyDate}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </Section>
    </>
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
  healthBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    backgroundColor: colors.surface2,
  },
  healthSegment: {
    height: "100%",
  },
  healthLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  repeatBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(245,183,49,0.12)",
  },
});
