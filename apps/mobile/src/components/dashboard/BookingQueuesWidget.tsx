import { to } from "@/utils/routes";
import { router } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import {
  ClipboardCheck,
  DollarSign,
  Package,
  PackageCheck,
  Truck,
  UserCheck,
  Wrench,
} from "lucide-react-native";
import { Pressable, View } from "react-native";
import { AppText, LoadingState, Section } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { useAppContext } from "@/context/AppContext";
import { useBookings } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import type { Booking } from "@/types/domain";

function QueueSection({
  title,
  icon,
  bookings,
}: {
  title: string;
  icon: LucideIcon;
  bookings: Booking[];
}) {
  return (
    <Section title={title} icon={icon} aside={`${bookings.length}`}>
      {bookings.length === 0 ? (
        <AppText variant="small" color={colors.text3}>
          Nothing in this queue right now.
        </AppText>
      ) : (
        <View style={{ gap: 10 }}>
          {bookings.slice(0, 5).map((booking) => (
            <Pressable
              key={booking.code}
              onPress={() => router.push(to(`/bookings/${booking.code}`))}
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="data" color={colors.accent} style={{ fontWeight: "900" }}>
                  {booking.code}
                </AppText>
                <AppText variant="small" color={colors.text2}>
                  {booking.client} · {booking.venue}
                </AppText>
              </View>
              <StatusBadge status={booking.status} />
            </Pressable>
          ))}
        </View>
      )}
    </Section>
  );
}

export function BookingQueuesWidget() {
  const { activeProfile } = useAppContext();
  const role = activeProfile.role;
  const { data: BOOKINGS = [], isLoading } = useBookings();

  if (isLoading) return <LoadingState label="Loading queues..." />;

  if (role === "CCR") {
    const reserved = BOOKINGS.filter((booking) => booking.status === "RESERVED");
    const unpaid = BOOKINGS.filter(
      (booking) => booking.payment === "UNPAID" || booking.payment === "ADVANCE",
    );
    return (
      <View style={{ gap: 16 }}>
        <QueueSection
          title="Reserved · needs confirmation"
          icon={ClipboardCheck}
          bookings={reserved}
        />
        <QueueSection title="Outstanding payments" icon={DollarSign} bookings={unpaid} />
      </View>
    );
  }

  if (role === "CTO") {
    const confirmed = BOOKINGS.filter((booking) => booking.status === "CONFIRMED");
    const assigned = BOOKINGS.filter((booking) => booking.status === "ASSIGNED");
    return (
      <View style={{ gap: 16 }}>
        <QueueSection title="Confirmed · needs crew" icon={UserCheck} bookings={confirmed} />
        <QueueSection
          title="Assigned · awaiting acceptance"
          icon={ClipboardCheck}
          bookings={assigned}
        />
      </View>
    );
  }

  if (role === "TO") {
    const assignedToMe = BOOKINGS.filter(
      (booking) =>
        booking.status === "ASSIGNED" &&
        booking.assignees.some((name) => activeProfile.name.startsWith(name)),
    );
    const inPrep = BOOKINGS.filter(
      (booking) => booking.status === "ACCEPTED" || booking.status === "PREPARATION",
    );
    return (
      <View style={{ gap: 16 }}>
        <QueueSection
          title="Waiting for your acceptance"
          icon={ClipboardCheck}
          bookings={assignedToMe}
        />
        <QueueSection title="In preparation" icon={Wrench} bookings={inPrep} />
      </View>
    );
  }

  if (role === "OO") {
    const dispatch = BOOKINGS.filter((booking) => booking.status === "PREPARATION");
    const onsite = BOOKINGS.filter((booking) => booking.status === "ONSITE");
    const checkinPending = BOOKINGS.filter((booking) => booking.status === "COMPLETED");
    return (
      <View style={{ gap: 16 }}>
        <QueueSection title="Ready for dispatch" icon={Truck} bookings={dispatch} />
        <QueueSection title="Active onsite" icon={Package} bookings={onsite} />
        <QueueSection title="Awaiting check-in" icon={PackageCheck} bookings={checkinPending} />
      </View>
    );
  }

  if (role === "SK") {
    const checkouts = BOOKINGS.filter((booking) => booking.status === "PREPARATION");
    const checkins = BOOKINGS.filter((booking) => booking.status === "COMPLETED");
    return (
      <View style={{ gap: 16 }}>
        <QueueSection title="Ready for check-out" icon={Package} bookings={checkouts} />
        <QueueSection title="Ready for check-in" icon={PackageCheck} bookings={checkins} />
      </View>
    );
  }

  return null;
}
