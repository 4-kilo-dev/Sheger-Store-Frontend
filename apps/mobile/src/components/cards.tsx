import { Calendar, Users } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { alpha, colors, radius } from "@/theme/tokens";
import type { Booking, InventoryItem, StaffMember } from "@/types/domain";
import { STATUS_LABELS } from "@/types/domain";
import { pct } from "@/utils/format";
import { AppText, Card, KV, ProgressBar } from "@/components/ui";
import { StatusBadge, ToneBadge } from "@/components/status";
import { push } from "@/utils/routes";
import type { LucideIcon } from "lucide-react-native";

export function BookingCard({
  booking,
  selectable,
  selected,
  onToggle,
}: {
  booking: Booking;
  selectable?: boolean;
  selected?: boolean;
  onToggle?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${booking.code}, ${booking.client}, ${STATUS_LABELS[booking.status]}`}
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => push(`/bookings/${booking.code}`)}
      onLongPress={selectable ? onToggle : undefined}
      delayLongPress={350}
      style={[styles.bookingCard, selected ? styles.selectedCard : null]}
    >
      <View style={styles.bookingBody}>
        <AppText variant="data" color={colors.accent} style={styles.code}>
          {booking.code}
        </AppText>
        <AppText style={styles.cardTitle} numberOfLines={1}>
          {booking.client}
        </AppText>
      </View>
      <StatusBadge status={booking.status} />
    </Pressable>
  );
}

export function InventoryCard({ item }: { item: InventoryItem }) {
  const utilized = pct(item.reserved + item.onsite, item.total);
  const tone =
    item.condition === "DAMAGED"
      ? colors.destructive
      : item.condition === "SERVICE DUE"
        ? colors.payment.ADVANCE
        : colors.success;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${item.id}, condition ${item.condition}`}
      onPress={() => push(`/inventory/${item.id}`)}
      style={styles.cardPress}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.cardTitle}>{item.name}</AppText>
          <AppText variant="data" color={colors.text3}>
            {item.id} · {item.model}
          </AppText>
        </View>
        <ToneBadge label={item.condition} tone={tone} />
      </View>
      <KV label="Category" value={item.category} />
      <KV label="Location" value={item.location} />
      <View style={{ gap: 7 }}>
        <View style={styles.cardFooter}>
          <AppText variant="small" color={colors.text2}>
            {item.reserved} reserved · {item.onsite} onsite
          </AppText>
          <AppText variant="data">{item.total}</AppText>
        </View>
        <ProgressBar value={utilized} />
      </View>
      <View style={styles.inventoryStats}>
        <MiniStat label="Available" value={item.available} tone={colors.success} />
        <MiniStat label="Reserved" value={item.reserved} tone={colors.payment.ADVANCE} />
        <MiniStat label="Onsite" value={item.onsite} tone={colors.status.ACCEPTED} />
        <MiniStat label="Damaged" value={item.damaged} tone={colors.destructive} />
      </View>
    </Pressable>
  );
}

export function StaffCard({ staff }: { staff: StaffMember }) {
  const workload = pct(staff.jobs, staff.capacity);
  const statusTone =
    staff.status === "ACTIVE"
      ? colors.success
      : staff.status === "ONSITE"
        ? colors.status.ACCEPTED
        : staff.status === "ON LEAVE"
          ? colors.payment.ADVANCE
          : colors.text3;
  return (
    <Card style={styles.staffCard}>
      <View style={styles.cardHeader}>
        <View style={styles.staffIdentity}>
          <View style={styles.avatar}>
            <AppText color={colors.accentForeground} style={{ fontWeight: "900", fontSize: 12 }}>
              {staff.initials}
            </AppText>
          </View>
          <View>
            <AppText style={styles.cardTitle}>{staff.name}</AppText>
            <AppText variant="small" color={colors.text2}>
              {staff.role}
            </AppText>
          </View>
        </View>
        <ToneBadge label={staff.status} tone={statusTone} />
      </View>
      <View style={styles.metaGrid}>
        <InfoLine icon={Users} text={staff.team} />
        <InfoLine icon={Calendar} text={`Joined ${staff.joinedDate}`} mono />
      </View>
      <View style={{ gap: 7 }}>
        <View style={styles.cardFooter}>
          <AppText variant="small" color={colors.text3}>
            Workload
          </AppText>
          <AppText
            variant="data"
            color={workload > 80 ? colors.destructive : colors.accent}
            style={{ fontWeight: "900" }}
          >
            {staff.jobs}/{staff.capacity} jobs ({workload}%)
          </AppText>
        </View>
        <ProgressBar value={workload} tone={workload > 80 ? colors.destructive : colors.accent} />
      </View>
    </Card>
  );
}

function InfoLine({ icon: Icon, text, mono }: { icon: LucideIcon; text: string; mono?: boolean }) {
  return (
    <View style={styles.infoLine}>
      <Icon size={13} color={colors.text3} />
      <AppText variant={mono ? "data" : "small"} color={colors.text2} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View style={styles.miniStat}>
      <AppText variant="eyebrow" color={colors.text3} style={{ fontSize: 8 }}>
        {label}
      </AppText>
      <AppText variant="data" color={tone} style={{ fontWeight: "900" }}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 56,
  },
  bookingBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  cardPress: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 12,
  },
  selectedCard: {
    borderColor: colors.accent,
    backgroundColor: alpha(colors.accent, 0.05),
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  code: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  metaGrid: {
    gap: 7,
  },
  infoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inventoryStats: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 10,
    gap: 8,
  },
  miniStat: {
    flex: 1,
    gap: 2,
  },
  staffCard: {
    padding: 14,
    gap: 12,
  },
  staffIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
  },
});
