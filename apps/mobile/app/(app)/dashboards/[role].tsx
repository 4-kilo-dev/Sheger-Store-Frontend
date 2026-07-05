import { router, useLocalSearchParams } from "expo-router";
import { to } from "@/utils/routes";
import type { LucideIcon } from "lucide-react-native";
import {
  CalendarCheck,
  ClipboardCheck,
  DollarSign,
  Headphones,
  Package,
  PackageCheck,
  Phone,
  RadioTower,
  Truck,
  Users,
  Utensils,
  Wrench,
} from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBadge } from "@/components/status";
import {
  AppText,
  Button,
  ErrorState,
  LoadingState,
  Screen,
  Section,
  StatCard,
} from "@/components/ui";
import { colors } from "@/theme/tokens";
import type { Booking } from "@/types/domain";
import { formatCurrency } from "@/utils/format";
import { useBookings } from "@/hooks/useOperations";

export default function RoleDashboardScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const normalized = (role ?? "ccr").toLowerCase();
  const { data: BOOKINGS = [], isLoading, isError, refetch } = useBookings();

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading workspace..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load bookings from the server." onRetry={() => refetch()} />
      </Screen>
    );
  }

  if (normalized === "ccr") return <CCR BOOKINGS={BOOKINGS} />;
  if (normalized === "cto") return <CTO BOOKINGS={BOOKINGS} />;
  if (normalized === "to") return <TO BOOKINGS={BOOKINGS} />;
  if (normalized === "oo") return <OO BOOKINGS={BOOKINGS} />;
  return <SK BOOKINGS={BOOKINGS} />;
}

function WorkspaceHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <View>
      <AppText variant="eyebrow">{eyebrow}</AppText>
      <View style={styles.titleRow}>
        <Icon size={24} color={colors.accent} />
        <AppText variant="title" style={{ flex: 1 }}>
          {title}
        </AppText>
      </View>
      <AppText variant="subtitle">{description}</AppText>
      <Button variant="outline" onPress={() => router.push(to("/dashboards"))}>
        All dashboards
      </Button>
    </View>
  );
}

function Queue({
  title,
  icon,
  count,
  children,
  tone = colors.accent,
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <Section title={title} icon={icon} aside={String(count)}>
      {count === 0 ? (
        <AppText variant="subtitle">All caught up — nothing waiting here</AppText>
      ) : (
        children
      )}
    </Section>
  );
}

function QueueRow({
  booking,
  action,
  onPress,
}: {
  booking: Booking;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={() => router.push(to(`/bookings/${booking.code}`))} style={styles.queueRow}>
      <View style={{ flex: 1 }}>
        <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
          {booking.code}
        </AppText>
        <AppText style={{ fontWeight: "800" }}>{booking.client}</AppText>
        <AppText variant="small" color={colors.text2}>
          {booking.venue} · {booking.screenType} · {booking.size}sqm
        </AppText>
      </View>
      {action ? (
        <Button onPress={onPress}>{action}</Button>
      ) : (
        <StatusBadge status={booking.status} />
      )}
    </Pressable>
  );
}

function CCR({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const reserved = BOOKINGS.filter((b) => b.status === "RESERVED");
  const unpaid = BOOKINGS.filter((b) => b.payment === "UNPAID" || b.payment === "ADVANCE");
  const confirmedToday = BOOKINGS.filter((b) => b.status === "CONFIRMED").length;
  return (
    <Screen>
      <WorkspaceHeader
        eyebrow="Client relations"
        title="Booking intake & payments"
        description="Confirm reservations and follow up on outstanding payments."
        icon={Headphones}
      />
      <StatCard
        label="Awaiting confirmation"
        value={reserved.length}
        note="Reservations that need payment to proceed"
        icon={Phone}
      />
      <StatCard
        label="Payment follow-ups"
        value={unpaid.length}
        note="Unpaid or partially paid bookings"
        icon={DollarSign}
        tone={colors.payment.ADVANCE}
      />
      <StatCard
        label="Confirmed today"
        value={confirmedToday}
        note="Bookings locked in so far today"
        icon={CalendarCheck}
      />
      <Queue title="Reservations waiting for confirmation" icon={Phone} count={reserved.length}>
        {reserved.slice(0, 5).map((b) => (
          <QueueRow key={b.code} booking={b} />
        ))}
      </Queue>
      <Queue
        title="Payment follow-ups"
        icon={DollarSign}
        count={unpaid.length}
        tone={colors.payment.ADVANCE}
      >
        {unpaid.slice(0, 5).map((b) => (
          <QueueRow key={b.code} booking={b} action={formatCurrency(b.amount)} />
        ))}
      </Queue>
      <Button icon={Phone} onPress={() => router.push(to("/bookings/new"))}>
        Create booking from client call
      </Button>
    </Screen>
  );
}

function CTO({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const confirmed = BOOKINGS.filter((b) => b.status === "CONFIRMED");
  const assigned = BOOKINGS.filter((b) => b.status === "ASSIGNED");
  const inPrep = BOOKINGS.filter((b) => b.status === "PREPARATION");
  return (
    <Screen>
      <WorkspaceHeader
        eyebrow="Technical operations"
        title="Screen config & crew assignment"
        description="Review confirmed bookings, verify screen specs, and assign lead technicians."
        icon={Wrench}
      />
      <StatCard label="Pending tech review" value={confirmed.length} icon={Wrench} />
      <StatCard label="Assigned to technicians" value={assigned.length} icon={Users} />
      <StatCard label="In preparation" value={inPrep.length} icon={ClipboardCheck} />
      <Queue title="Bookings ready for tech review" icon={Wrench} count={confirmed.length}>
        {confirmed.slice(0, 6).map((b) => (
          <QueueRow key={b.code} booking={b} action="Review & assign" />
        ))}
      </Queue>
      <Section title="Screen availability" icon={Package}>
        {["P2.97", "P4", "P3.91 INDOOR"].map((type) => (
          <View key={type} style={styles.screenLine}>
            <AppText variant="data" style={{ fontWeight: "900" }}>
              {type}
            </AppText>
            <AppText variant="small" color={colors.text2}>
              {
                BOOKINGS.filter(
                  (b) =>
                    b.screenType === type &&
                    [
                      "RESERVED",
                      "CONFIRMED",
                      "ASSIGNED",
                      "ACCEPTED",
                      "PREPARATION",
                      "ONSITE",
                    ].includes(b.status),
                ).length
              }{" "}
              active bookings
            </AppText>
          </View>
        ))}
      </Section>
    </Screen>
  );
}

function TO({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const assigned = BOOKINGS.filter((b) => b.status === "ASSIGNED");
  const accepted = BOOKINGS.filter((b) => b.status === "ACCEPTED");
  const inPrep = BOOKINGS.filter((b) => b.status === "PREPARATION");
  return (
    <Screen>
      <WorkspaceHeader
        eyebrow="Field operations"
        title="Your assignments & prep"
        description="Accept assigned bookings, prepare the bill of materials, and run your field setups."
        icon={ClipboardCheck}
      />
      <StatCard label="New assignments" value={assigned.length} icon={ClipboardCheck} />
      <StatCard
        label="Accepted"
        value={accepted.length}
        icon={CalendarCheck}
        tone={colors.success}
      />
      <StatCard
        label="In preparation"
        value={inPrep.length}
        icon={Package}
        tone={colors.payment.ADVANCE}
      />
      <Queue title="Assignments waiting for you" icon={ClipboardCheck} count={assigned.length}>
        {assigned.slice(0, 5).map((b) => (
          <QueueRow key={b.code} booking={b} action="Accept assignment" />
        ))}
      </Queue>
      <Queue title="Ready for BOM preparation" icon={Package} count={accepted.length}>
        {accepted.slice(0, 5).map((b) => (
          <QueueRow key={b.code} booking={b} action="Prepare BOM" />
        ))}
      </Queue>
    </Screen>
  );
}

function OO({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const ready = BOOKINGS.filter((b) => b.status === "PREPARATION");
  const onsite = BOOKINGS.filter((b) => b.status === "ONSITE");
  const completed = BOOKINGS.filter((b) => b.status === "COMPLETED");
  return (
    <Screen>
      <WorkspaceHeader
        eyebrow="Logistics & dispatch"
        title="Transport, crew & site ops"
        description="Dispatch teams and vehicles, manage onsite operations, and approve meal budgets."
        icon={RadioTower}
      />
      <StatCard label="Ready to dispatch" value={ready.length} icon={Truck} />
      <StatCard label="Active onsite" value={onsite.length} icon={RadioTower} />
      <StatCard label="Pending check-in" value={completed.length} icon={PackageCheck} />
      <StatCard label="Meal budgets active" value={onsite.length} icon={Utensils} />
      <Queue title="Ready to dispatch" icon={Truck} count={ready.length}>
        {ready.slice(0, 5).map((b) => (
          <QueueRow key={b.code} booking={b} action="Dispatch team" />
        ))}
      </Queue>
      <Queue title="Equipment ready for check-out" icon={PackageCheck} count={ready.length}>
        {ready.slice(0, 5).map((b) => (
          <QueueRow
            key={b.code}
            booking={b}
            action="Check out"
            onPress={() => router.push(to("/checkout"))}
          />
        ))}
      </Queue>
    </Screen>
  );
}

function SK({ BOOKINGS }: { BOOKINGS: Booking[] }) {
  const onsite = BOOKINGS.filter((b) => b.status === "ONSITE");
  const completed = BOOKINGS.filter((b) => b.status === "COMPLETED");
  const checkedOut = BOOKINGS.filter((b) =>
    b.bomItems.some((item) => item.status === "Checked Out"),
  );
  const reservedItems = BOOKINGS.reduce(
    (sum, booking) => sum + booking.bomItems.filter((item) => item.status === "Reserved").length,
    0,
  );
  return (
    <Screen>
      <WorkspaceHeader
        eyebrow="Warehouse"
        title="Inventory & check-ins"
        description="Verify equipment returns, process check-outs, and flag damage."
        icon={PackageCheck}
      />
      <StatCard label="Materials out" value={onsite.length} />
      <StatCard label="Pending return" value={completed.length} />
      <StatCard label="Damage queue" value={3} tone={colors.destructive} />
      <StatCard label="Reserved items" value={reservedItems} />
      <Queue title="Equipment waiting for check-in" icon={PackageCheck} count={completed.length}>
        {completed.slice(0, 5).map((b) => (
          <QueueRow
            key={b.code}
            booking={b}
            action="Check in"
            onPress={() => router.push(to("/checkout"))}
          />
        ))}
      </Queue>
      <Queue title="Checked-out equipment" icon={Truck} count={checkedOut.length}>
        {checkedOut.slice(0, 5).map((b) => (
          <QueueRow key={b.code} booking={b} />
        ))}
      </Queue>
      <Button variant="danger" icon={Package} onPress={() => router.push(to("/damage-report"))}>
        Report damaged equipment
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  queueRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  screenLine: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: 8,
    padding: 12,
  },
});
