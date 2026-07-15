import { to } from "@/utils/routes";
import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { View, StyleSheet } from "react-native";
import { AppText, Button, Card } from "@/components/ui";
import { StatusBadge, StatusStepper } from "@/components/status";
import { useBookings } from "@/hooks/useOperations";

export function FeaturedBookingWidget() {
  const { data: BOOKINGS = [] } = useBookings();
  const featured = BOOKINGS.find((booking) => booking.status === "PREPARATION") ?? BOOKINGS[4];
  if (!featured) return null;

  return (
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
      <Button
        variant="outline"
        icon={ArrowRight}
        onPress={() => router.push(to(`/bookings/${featured.code}`))}
      >
        Open booking
      </Button>
    </Card>
  );
}

const styles = StyleSheet.create({
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
});
