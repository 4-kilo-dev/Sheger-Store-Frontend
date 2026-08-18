import { to } from "@/utils/routes";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { useBookings } from "@/hooks/useOperations";
import { useDateFormatter } from "@/context/CalendarSystemContext";
import { colors, radius } from "@/theme/tokens";
import type { Booking } from "@/types/domain";

function pickNextBooking(bookings: Booking[]): Booking | undefined {
  const open = bookings.filter(
    (booking) => booking.status !== "CANCELED" && booking.status !== "DONE",
  );
  if (open.length === 0) return undefined;

  const live = open.filter(
    (booking) => booking.status === "ONSITE" || booking.status === "PREPARATION",
  );
  if (live.length > 0) {
    return [...live].sort((a, b) => (a.assemblyDate || "").localeCompare(b.assemblyDate || ""))[0];
  }

  const now = Date.now();
  const upcoming = open
    .filter((booking) => {
      const t = new Date(booking.assemblyDate || booking.eventDate).getTime();
      return Number.isFinite(t) && t >= now;
    })
    .sort((a, b) =>
      (a.assemblyDate || a.eventDate || "").localeCompare(b.assemblyDate || b.eventDate || ""),
    );
  return upcoming[0] ?? open[0];
}

export function FeaturedBookingWidget() {
  const { data: BOOKINGS = [] } = useBookings();
  const { formatDate } = useDateFormatter();
  const featured = pickNextBooking(BOOKINGS);
  if (!featured) return null;

  const sizeLabel = featured.size > 0 ? `${featured.size} sqm` : "";
  const meta = [formatDate(featured.eventDate), sizeLabel].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Next up ${featured.code}, ${featured.client}`}
      onPress={() => router.push(to(`/bookings/${featured.code}`))}
      style={styles.card}
    >
      <View style={styles.header}>
        <AppText variant="eyebrow">Next up</AppText>
        <StatusBadge status={featured.status} />
      </View>
      <AppText variant="data" color={colors.accent} style={styles.code}>
        {featured.code}
      </AppText>
      <AppText style={styles.client} numberOfLines={1}>
        {featured.client}
      </AppText>
      {meta ? (
        <AppText variant="data" color={colors.text3} numberOfLines={1}>
          {meta}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 14,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6,
  },
  code: {
    fontWeight: "800",
  },
  client: {
    fontSize: 15,
    fontWeight: "800",
  },
});
