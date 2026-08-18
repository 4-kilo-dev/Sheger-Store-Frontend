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
import { View } from "react-native";
import { BookingCard } from "@/components/cards";
import { AppText, LoadingState, Section } from "@/components/ui";
import { useAppContext } from "@/context/AppContext";
import { useBookings } from "@/hooks/useOperations";
import { colors } from "@/theme/tokens";
import type { Booking } from "@/types/domain";

function namesMatch(assignee: string, profileName: string) {
  const a = assignee.trim().toLowerCase();
  const p = profileName.trim().toLowerCase();
  return a === p || a.startsWith(p) || p.startsWith(a);
}

function QueueSection({
  title,
  icon,
  bookings,
}: {
  title: string;
  icon: LucideIcon;
  bookings: Booking[];
}) {
  if (bookings.length === 0) return null;
  return (
    <Section title={title} icon={icon} aside={`${bookings.length}`}>
      <View>
        {bookings.slice(0, 5).map((booking) => (
          <BookingCard key={booking.code} booking={booking} plain />
        ))}
      </View>
    </Section>
  );
}

export function BookingQueuesWidget() {
  const { activeProfile } = useAppContext();
  const role = activeProfile.role;
  const { data: BOOKINGS = [], isLoading } = useBookings();

  if (isLoading) return <LoadingState label="Loading queues..." />;

  const queues: { title: string; icon: LucideIcon; bookings: Booking[] }[] =
    role === "CCR"
      ? [
          {
            title: "Needs confirmation",
            icon: ClipboardCheck,
            bookings: BOOKINGS.filter((booking) => booking.status === "RESERVED"),
          },
          {
            title: "Outstanding payments",
            icon: DollarSign,
            bookings: BOOKINGS.filter(
              (booking) => booking.payment === "UNPAID" || booking.payment === "ADVANCE",
            ),
          },
        ]
      : role === "CTO"
        ? [
            {
              title: "Ready to assign",
              icon: Wrench,
              bookings: BOOKINGS.filter((booking) => booking.status === "CONFIRMED"),
            },
            {
              title: "Waiting on accept",
              icon: UserCheck,
              bookings: BOOKINGS.filter((booking) => booking.status === "ASSIGNED"),
            },
          ]
        : role === "TO" || role === "SH" || role === "FL"
          ? [
              {
                title: "Waiting for you",
                icon: ClipboardCheck,
                bookings: BOOKINGS.filter(
                  (booking) =>
                    booking.status === "ASSIGNED" &&
                    booking.assignees.some((name) => namesMatch(name, activeProfile.name)),
                ),
              },
              {
                title: "In preparation",
                icon: Wrench,
                bookings: BOOKINGS.filter(
                  (booking) => booking.status === "ACCEPTED" || booking.status === "PREPARATION",
                ),
              },
            ]
          : role === "OO"
            ? [
                {
                  title: "Ready for dispatch",
                  icon: Truck,
                  bookings: BOOKINGS.filter((booking) => booking.status === "PREPARATION"),
                },
                {
                  title: "Onsite",
                  icon: Package,
                  bookings: BOOKINGS.filter((booking) => booking.status === "ONSITE"),
                },
                {
                  title: "Awaiting check-in",
                  icon: PackageCheck,
                  bookings: BOOKINGS.filter(
                    (booking) =>
                      booking.status === "COMPLETED" || booking.status === "PARTIALLY_RETURNED",
                  ),
                },
              ]
            : role === "SK"
              ? [
                  {
                    title: "Ready to check out",
                    icon: Package,
                    bookings: BOOKINGS.filter((booking) => booking.status === "PREPARATION"),
                  },
                  {
                    title: "Ready to check in",
                    icon: PackageCheck,
                    bookings: BOOKINGS.filter(
                      (booking) =>
                        booking.status === "COMPLETED" || booking.status === "PARTIALLY_RETURNED",
                    ),
                  },
                ]
              : [];

  const visible = queues.filter((queue) => queue.bookings.length > 0);
  if (visible.length === 0) {
    return (
      <Section title="Your queue" icon={ClipboardCheck}>
        <AppText variant="small" color={colors.text3}>
          Nothing waiting right now.
        </AppText>
      </Section>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      {visible.map((queue) => (
        <QueueSection
          key={queue.title}
          title={queue.title}
          icon={queue.icon}
          bookings={queue.bookings}
        />
      ))}
    </View>
  );
}
