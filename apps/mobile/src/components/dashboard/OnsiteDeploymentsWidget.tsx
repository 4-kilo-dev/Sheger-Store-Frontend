import { Zap } from "lucide-react-native";
import { View } from "react-native";
import { BookingCard } from "@/components/cards";
import { Section } from "@/components/ui";
import { useBookings } from "@/hooks/useOperations";

export function OnsiteDeploymentsWidget() {
  const { data: BOOKINGS = [] } = useBookings();
  const onsiteBookings = BOOKINGS.filter((booking) => booking.status === "ONSITE").slice(0, 4);
  if (onsiteBookings.length === 0) return null;

  return (
    <Section title="Onsite now" icon={Zap} aside={`${onsiteBookings.length}`}>
      <View>
        {onsiteBookings.map((booking) => (
          <BookingCard key={booking.code} booking={booking} plain />
        ))}
      </View>
    </Section>
  );
}
