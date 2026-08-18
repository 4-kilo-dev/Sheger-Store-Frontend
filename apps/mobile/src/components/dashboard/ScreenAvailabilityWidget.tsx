import { View, StyleSheet } from "react-native";
import { AppText, LoadingState, Section } from "@/components/ui";
import { useBookings } from "@/hooks/useOperations";
import { colors, radius } from "@/theme/tokens";
import { Monitor } from "lucide-react-native";

const SCREEN_TYPES = ["P2.97", "P4", "P3.91 INDOOR"] as const;
const ACTIVE_STATUSES = new Set([
  "RESERVED",
  "CONFIRMED",
  "ASSIGNED",
  "ACCEPTED",
  "PREPARATION",
  "ONSITE",
]);

export function ScreenAvailabilityWidget() {
  const { data: bookings = [], isLoading } = useBookings();

  if (isLoading) return <LoadingState label="Loading screen availability..." />;

  return (
    <Section title="Screens in use" icon={Monitor}>
      <View style={styles.grid}>
        {SCREEN_TYPES.map((type) => {
          const count = bookings.filter(
            (booking) => booking.screenType === type && ACTIVE_STATUSES.has(booking.status),
          ).length;
          return (
            <View key={type} style={styles.card}>
              <AppText variant="data" style={{ fontWeight: "900" }}>
                {type}
              </AppText>
              <AppText variant="small" color={colors.text2}>
                {count} in active jobs
              </AppText>
            </View>
          );
        })}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  card: {
    flexGrow: 1,
    minWidth: "30%",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: 12,
    gap: 4,
  },
});
