import { to } from "@/utils/routes";
import { router } from "expo-router";
import { CalendarRange } from "lucide-react-native";
import { View } from "react-native";
import { BookingCard } from "@/components/cards";
import { AppText, Button, Section } from "@/components/ui";
import { useBookings } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";

export function RecentBookingsWidget() {
  const { data: BOOKINGS = [] } = useBookings();
  const recent = [...BOOKINGS]
    .sort((a, b) =>
      (b.createdAt || b.eventDate || "").localeCompare(a.createdAt || a.eventDate || ""),
    )
    .slice(0, 6);

  return (
    <Section
      title="Recent bookings"
      icon={CalendarRange}
      action={
        <Button variant="ghost" onPress={() => router.push(to("/bookings"))}>
          All
        </Button>
      }
    >
      {recent.length === 0 ? (
        <AppText variant="small" color={colors.text3}>
          No bookings yet.
        </AppText>
      ) : (
        <View>
          {recent.map((booking) => (
            <BookingCard key={booking.code} booking={booking} plain />
          ))}
        </View>
      )}
    </Section>
  );
}
