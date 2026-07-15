import { Zap } from "lucide-react-native";
import { View } from "react-native";
import { Section } from "@/components/ui";
import { BookingCard } from "@/components/cards";
import { useBookings } from "@/hooks/useOperations";

export function OnsiteDeploymentsWidget() {
  const { data: BOOKINGS = [] } = useBookings();
  const onsiteBookings = BOOKINGS.filter((booking) => booking.status === "ONSITE").slice(0, 4);
  if (onsiteBookings.length === 0) return null;

  return (
    <Section title="Screens onsite now" icon={Zap} aside={`${onsiteBookings.length} active`}>
      <View style={{ gap: 12 }}>
        {onsiteBookings.map((booking) => (
          <BookingCard key={booking.code} booking={booking} />
        ))}
      </View>
    </Section>
  );
}
