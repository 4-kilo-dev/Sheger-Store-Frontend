import { router } from "expo-router";
import { to } from "@/utils/routes";
import { AlertCircle, ChevronDown, ChevronRight, RotateCcw, Truck, User, Users } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { StatusBadge } from "@/components/status";
import { AppText, ErrorState, Input, LoadingState, Screen, Section } from "@/components/ui";
import { useBookings } from "@/hooks/useOperations";
import { colors, radius } from "@/theme/tokens";
import type { Booking, BookingStatus } from "@/types/domain";
import { Search } from "lucide-react-native";

function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isActiveOrUpcoming(booking: Booking, now = new Date()): boolean {
  const day =
    parseDay(booking.dismantleDate) ||
    parseDay(booking.eventDate) ||
    parseDay(booking.assemblyDate);
  if (!day) return true;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return day.getTime() >= today.getTime();
}

const DISPATCH_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "ASSIGNED",
  "ACCEPTED",
  "PREPARATION",
];

const COLUMNS: {
  title: string;
  statuses: BookingStatus[];
  upcomingOnly?: boolean;
  color: string;
  emptyMsg: string;
}[] = [
  {
    title: "Needs Dispatch",
    statuses: DISPATCH_STATUSES,
    upcomingOnly: true,
    color: colors.payment.ADVANCE,
    emptyMsg: "No upcoming bookings awaiting dispatch.",
  },
  {
    title: "Active On-Site",
    statuses: ["ONSITE"],
    color: colors.status.ACCEPTED,
    emptyMsg: "No active on-site deployments.",
  },
  {
    title: "Needs Retrieval",
    statuses: ["COMPLETED", "PARTIALLY_RETURNED"],
    color: "#6366f1",
    emptyMsg: "No gear awaiting warehouse return.",
  },
];

export default function OperationsScreen() {
  const { data: bookings = [], isLoading, isError, refetch } = useBookings({ poll: true });
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (title: string) =>
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (!q) return true;
      return (
        b.code.toLowerCase().includes(q) ||
        b.client.toLowerCase().includes(q) ||
        b.venue.toLowerCase().includes(q)
      );
    });
  }, [bookings, search]);

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Loading operations board..." />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState detail="Could not load operations data." onRetry={() => refetch()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <AppText variant="eyebrow">Field Operations</AppText>
        <AppText variant="title">Operations Board</AppText>
        <AppText variant="subtitle">
          Oversee crew dispatch, monitor active deployments, and coordinate gear returns.
        </AppText>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.text3} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search code, client, venue..."
            style={{ flex: 1, borderWidth: 0, backgroundColor: "transparent", minHeight: 44 }}
          />
        </View>
      </View>

      <View style={styles.board}>
        {COLUMNS.map((col) => {
          const items = filtered
            .filter((b) => col.statuses.includes(b.status))
            .filter((b) => (col.upcomingOnly ? isActiveOrUpcoming(b) : true));
          const isCollapsed = collapsed[col.title] ?? false;
          const Chevron = isCollapsed ? ChevronRight : ChevronDown;
          return (
            <View key={col.title} style={styles.column}>
              <Pressable
                onPress={() => toggleCollapse(col.title)}
                style={[styles.columnHeader, { borderLeftColor: col.color }]}
                accessibilityRole="button"
                accessibilityLabel={`${col.title}, ${items.length} items, ${isCollapsed ? "collapsed" : "expanded"}`}
              >
                <View style={styles.columnDot}>
                  <View style={[styles.dot, { backgroundColor: col.color }]} />
                  <AppText variant="eyebrow" style={{ color: col.color }}>
                    {col.title}
                  </AppText>
                </View>
                <View style={styles.columnHeaderRight}>
                  <View style={[styles.countBadge, { backgroundColor: `${col.color}22` }]}>
                    <AppText variant="data" style={{ color: col.color, fontWeight: "900" }}>
                      {items.length}
                    </AppText>
                  </View>
                  <Chevron size={15} color={col.color} />
                </View>
              </Pressable>
              {!isCollapsed ? (
                <View style={styles.columnBody}>
                  {items.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} accentColor={col.color} />
                  ))}
                  {items.length === 0 && (
                    <AppText
                      variant="small"
                      color={colors.text3}
                      style={{ padding: 16, textAlign: "center" }}
                    >
                      {col.emptyMsg}
                    </AppText>
                  )}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function BookingCard({ booking, accentColor }: { booking: Booking; accentColor: string }) {
  const crewCount = (booking.assignments || []).filter(
    (a) => a.roleContext === "CREW" || a.roleContext === "TECHNICIAN",
  ).length;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View booking ${booking.code}`}
      onPress={() => router.push(to(`/bookings/${booking.code}`))}
      style={({ pressed }) => [styles.card, { borderLeftColor: accentColor, opacity: pressed ? 0.8 : 1 }]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="data" style={{ color: accentColor, fontWeight: "900", fontSize: 11 }}>
            {booking.code}
          </AppText>
          <AppText style={{ fontWeight: "800", marginTop: 2 }} numberOfLines={1}>
            {booking.client}
          </AppText>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {/* Meta */}
      <View style={{ gap: 3, marginTop: 6 }}>
        <AppText variant="small" color={colors.text2} numberOfLines={1}>
          📍 {booking.venue || "—"}
        </AppText>
        <AppText variant="small" color={colors.text3}>
          📅 {booking.eventDate}
        </AppText>
      </View>

      {/* Context row by status */}
      {booking.status === "ONSITE" ? (
        <View style={[styles.contextRow, { borderTopColor: colors.border }]}>
          <View style={styles.contextItem}>
            <User size={11} color={accentColor} />
            <AppText variant="small" color={colors.text2} numberOfLines={1} style={{ flex: 1 }}>
              {booking.teamLeader || "No lead"}
            </AppText>
          </View>
          <View style={styles.contextItem}>
            <Truck size={11} color={accentColor} />
            <AppText variant="small" color={colors.text2} numberOfLines={1} style={{ flex: 1 }}>
              {booking.driver || "No driver"}
            </AppText>
          </View>
        </View>
      ) : DISPATCH_STATUSES.includes(booking.status) ? (
        <View style={[styles.contextRow, { borderTopColor: colors.border }]}>
          {crewCount > 0 ? (
            <View style={styles.contextItem}>
              <Users size={11} color={accentColor} />
              <AppText variant="small" color={colors.text2}>
                {crewCount} crew assigned
              </AppText>
            </View>
          ) : (
            <View style={styles.contextItem}>
              <AlertCircle size={11} color={colors.payment.ADVANCE} />
              <AppText variant="small" style={{ color: colors.payment.ADVANCE, fontWeight: "700" }}>
                No crew assigned
              </AppText>
            </View>
          )}
        </View>
      ) : booking.status === "COMPLETED" || booking.status === "PARTIALLY_RETURNED" ? (
        <View style={[styles.contextRow, { borderTopColor: colors.border }]}>
          <View style={styles.contextItem}>
            <RotateCcw size={11} color={accentColor} />
            <AppText variant="small" color={colors.text2}>
              {booking.status === "PARTIALLY_RETURNED"
                ? "Partial return — awaiting remainder"
                : "Awaiting warehouse return"}
            </AppText>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    marginBottom: 4,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    backgroundColor: colors.surface2,
    minHeight: 44,
    gap: 10,
  },
  board: {
    gap: 12,
  },
  column: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface2,
  },
  columnDot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  columnHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countBadge: {
    borderRadius: radius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  columnBody: {
    padding: 10,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    padding: 12,
    gap: 0,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  contextRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
