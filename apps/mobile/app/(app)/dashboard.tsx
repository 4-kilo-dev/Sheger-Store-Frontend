import { router } from "expo-router";
import {
  ArrowRight,
  BarChart3,
  CalendarRange,
  Clock,
  MapPin,
  Package,
  Plus,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BookingCard } from "@/components/cards";
import { PaymentBadge, StatusBadge, StatusStepper } from "@/components/status";
import { AppText, Button, Card, ProgressBar, Screen, Section, StatCard } from "@/components/ui";
import { BOOKINGS, INVENTORY } from "@/data/mock";
import { colors, radius } from "@/theme/tokens";
import { formatCompactCurrency, pct } from "@/utils/format";

export default function DashboardScreen() {
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
    const totalInventory = INVENTORY.reduce((sum, item) => sum + item.total, 0);
    const availableInventory = INVENTORY.reduce((sum, item) => sum + item.available, 0);
    const onsiteInventory = INVENTORY.reduce((sum, item) => sum + item.onsite, 0);
    return { thisMonth, revenue, onsite, upcoming, paid, totalInventory, availableInventory, onsiteInventory };
  }, []);

  const featured = BOOKINGS.find((booking) => booking.status === "PREPARATION") ?? BOOKINGS[4];
  const recent = BOOKINGS.slice(0, 6);
  const onsiteBookings = BOOKINGS.filter((booking) => booking.status === "ONSITE").slice(0, 4);

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow">Today's operations</AppText>
          <AppText variant="title">Dashboard</AppText>
          <AppText variant="subtitle">Bookings, equipment, and crew at a glance.</AppText>
        </View>
        <Button variant="ghost" icon={ArrowRight} onPress={() => router.push("/bookings")}>
          All bookings
        </Button>
      </View>

      <View style={styles.grid}>
        <StatCard label="Bookings this month" value={stats.thisMonth.length} note={`${stats.paid} paid`} icon={CalendarRange} />
        <StatCard label="Revenue" value={formatCompactCurrency(stats.revenue)} note="+14.2% from last month" icon={TrendingUp} tone={colors.success} />
        <StatCard label="Screens onsite" value={stats.onsite.length} note="Active right now" icon={Package} tone={colors.status.ACCEPTED} />
        <StatCard label="Assemblies this week" value={stats.upcoming.length} note="Next 7 days" icon={Clock} tone={colors.payment.ADVANCE} />
      </View>

      <View style={styles.quickGrid}>
        <QuickAction label="New booking" icon={Plus} href="/bookings/new" accent />
        <QuickAction label="Check out equipment" icon={Package} href="/checkout" />
        <QuickAction label="Report damage" icon={ShieldAlert} href="/damage-report" />
        <QuickAction label="View reports" icon={BarChart3} href="/reports" />
      </View>

      <Card style={styles.featured}>
        <View style={styles.featuredHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="eyebrow">{featured.code}</AppText>
            <AppText style={styles.featuredTitle}>
              {featured.client} · {featured.venue}
            </AppText>
          </View>
          <StatusBadge status={featured.status} />
        </View>
        <StatusStepper current={featured.status} />
        <Button variant="outline" icon={ArrowRight} onPress={() => router.push(`/bookings/${featured.code}`)}>
          Open booking
        </Button>
      </Card>

      <Section title="Equipment pool" icon={Package} action={<Button variant="ghost" onPress={() => router.push("/inventory")}>View</Button>}>
        <View style={styles.poolRow}>
          <View style={styles.poolGauge}>
            <AppText variant="stat">{pct(stats.availableInventory, stats.totalInventory)}%</AppText>
            <AppText variant="eyebrow" color={colors.text3}>
              Available
            </AppText>
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <PoolLine label="Available" value={stats.availableInventory} tone={colors.success} />
            <PoolLine
              label="Reserved"
              value={stats.totalInventory - stats.availableInventory - stats.onsiteInventory}
              tone={colors.payment.ADVANCE}
            />
            <PoolLine label="Onsite" value={stats.onsiteInventory} tone={colors.status.ACCEPTED} />
          </View>
        </View>
      </Section>

      <Section title="Recent bookings" icon={CalendarRange} action={<Button variant="ghost" onPress={() => router.push("/bookings")}>All</Button>}>
        <View style={{ gap: 12 }}>
          {recent.map((booking) => (
            <Pressable key={booking.code} onPress={() => router.push(`/bookings/${booking.code}`)} style={styles.compactRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {booking.code}
                </AppText>
                <AppText style={{ fontWeight: "800" }}>{booking.client}</AppText>
                <AppText variant="small" color={colors.text2}>
                  {booking.venue} · {booking.eventDate} · {booking.screenType}
                </AppText>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <StatusBadge status={booking.status} />
                <PaymentBadge status={booking.payment} />
              </View>
            </Pressable>
          ))}
        </View>
      </Section>

      {onsiteBookings.length > 0 ? (
        <Section title="Screens onsite now" icon={Zap} aside={`${onsiteBookings.length} active`}>
          <View style={{ gap: 12 }}>
            {onsiteBookings.map((booking) => (
              <BookingCard key={booking.code} booking={booking} />
            ))}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}

function QuickAction({ label, href, icon: Icon, accent }: { label: string; href: string; icon: any; accent?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push(href as any)}
      style={[styles.quickAction, accent ? styles.quickActionAccent : null]}
    >
      <View style={[styles.quickIcon, accent ? styles.quickIconAccent : null]}>
        <Icon size={17} color={accent ? colors.accentForeground : colors.accent} />
      </View>
      <AppText style={styles.quickText}>{label}</AppText>
    </Pressable>
  );
}

function PoolLine({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View style={{ gap: 5 }}>
      <View style={styles.poolLineTop}>
        <View style={styles.poolLabel}>
          <View style={[styles.poolDot, { backgroundColor: tone }]} />
          <AppText variant="small">{label}</AppText>
        </View>
        <AppText variant="data" style={{ fontWeight: "900" }}>
          {value}
        </AppText>
      </View>
      <ProgressBar value={Math.min(100, value / 2)} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  grid: {
    gap: 12,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAction: {
    width: "48%",
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 9,
  },
  quickActionAccent: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245,183,49,0.08)",
  },
  quickIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconAccent: {
    backgroundColor: colors.accent,
  },
  quickText: {
    fontSize: 12,
    fontWeight: "800",
  },
  featured: {
    padding: 16,
    gap: 16,
  },
  featuredHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  featuredTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  poolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  poolGauge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  poolLineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  poolLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  poolDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactRow: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
});
