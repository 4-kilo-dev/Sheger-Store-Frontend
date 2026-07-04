import { to } from "@/utils/routes";
import { router } from "expo-router";
import { CalendarRange } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText, Button, Section } from "@/components/ui";
import { PaymentBadge, StatusBadge } from "@/components/status";
import { BOOKINGS } from "@/data/mock";
import { colors } from "@/theme/tokens";

export function RecentBookingsWidget() {
  const recent = BOOKINGS.slice(0, 6);

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
      <View style={{ gap: 12 }}>
        {recent.map((booking) => (
          <Pressable
            key={booking.code}
            onPress={() => router.push(to(`/bookings/${booking.code}`))}
            style={{
              flexDirection: "row",
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              paddingBottom: 12,
            }}
          >
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
  );
}
