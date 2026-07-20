import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Button, ErrorState, Input, LoadingState, Screen, Section } from "@/components/ui";
import { useBookings } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import type { Booking, BookingStatus } from "@/types/domain";
import { Search } from "lucide-react-native";

const COLUMNS: { title: string; statuses: BookingStatus[]; color: string }[] = [
  { title: "Needs Dispatch", statuses: ["ACCEPTED", "PREPARATION"], color: colors.payment.ADVANCE },
  { title: "Active On-Site", statuses: ["ONSITE"], color: colors.status.ACCEPTED },
  { title: "Needs Retrieval", statuses: ["COMPLETED", "PARTIALLY_RETURNED"], color: colors.destructive },
];

export default function OperationsScreen() {
  const { data: bookings = [], isLoading, isError, refetch } = useBookings();
  const [search, setSearch] = useState("");

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
          Live view of dispatch, on-site, and retrieval status.
        </AppText>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Search size={18} color={colors.text3} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search code, client, venue..."
            style={{ flex: 1 }}
          />
        </View>
      </View>

      <View style={styles.board}>
        {COLUMNS.map((col) => {
          const items = filtered.filter((b) => col.statuses.includes(b.status));
          return (
            <View key={col.title} style={styles.column}>
              <View style={[styles.columnHeader, { borderLeftColor: col.color }]}>
                <AppText variant="eyebrow" style={{ color: col.color }}>
                  {col.title}
                </AppText>
                <AppText variant="data" color={colors.text3}>
                  {items.length}
                </AppText>
              </View>
              <View style={styles.columnBody}>
                {items.map((booking) => (
                  <View key={booking.code} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                        {booking.code}
                      </AppText>
                    </View>
                    <AppText style={{ fontWeight: "800" }}>{booking.client}</AppText>
                    <AppText variant="small" color={colors.text2}>
                      {booking.venue}
                    </AppText>
                    <AppText variant="small" color={colors.text3}>
                      {booking.eventDate}
                    </AppText>
                    <View style={styles.cardFooter}>
                      <AppText variant="eyebrow" color={colors.text3}>
                        {booking.screenType} · {booking.size} sqm
                      </AppText>
                    </View>
                  </View>
                ))}
                {items.length === 0 && (
                  <AppText variant="small" color={colors.text3} style={{ padding: 12, textAlign: "center" }}>
                    No bookings
                  </AppText>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
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
    borderRadius: 10,
    backgroundColor: colors.surface2,
    overflow: "hidden",
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  columnBody: {
    padding: 10,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  cardHeader: {
    marginBottom: 4,
  },
  cardFooter: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
