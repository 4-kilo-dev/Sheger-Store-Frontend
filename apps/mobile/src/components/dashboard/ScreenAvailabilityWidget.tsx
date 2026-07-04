import { Monitor } from "lucide-react-native";
import { View } from "react-native";
import { AppText, Card, Section } from "@/components/ui";
import { useBookings } from "@/hooks/useOperations";
import { colors, radius } from "@/theme/tokens";

const ACTIVE_STATUSES = ["RESERVED", "CONFIRMED", "ASSIGNED", "ACCEPTED", "PREPARATION", "ONSITE"];
const SCREEN_TYPES = ["P2.97", "P4", "P3.91 INDOOR"] as const;

export function ScreenAvailabilityWidget() {
  const { data: BOOKINGS = [] } = useBookings();
  return (
    <Section title="Screen availability" icon={Monitor}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {SCREEN_TYPES.map((type) => {
          const activeCount = BOOKINGS.filter(
            (booking) => booking.screenType === type && ACTIVE_STATUSES.includes(booking.status),
          ).length;
          return (
            <Card
              key={type}
              style={{
                flexGrow: 1,
                minWidth: "30%",
                padding: 12,
                backgroundColor: colors.surface2,
                borderRadius: radius.md,
              }}
            >
              <AppText variant="data" style={{ fontWeight: "900" }}>
                {type}
              </AppText>
              <AppText variant="small" color={colors.text2} style={{ marginTop: 4 }}>
                {activeCount} active bookings
              </AppText>
            </Card>
          );
        })}
      </View>
    </Section>
  );
}
