import type { WidgetId } from "@/config/dashboard-widgets";
import { BookingQueuesWidget } from "./BookingQueuesWidget";
import { EquipmentPoolWidget } from "./EquipmentPoolWidget";
import { FeaturedBookingWidget } from "./FeaturedBookingWidget";
import { OnsiteDeploymentsWidget } from "./OnsiteDeploymentsWidget";
import { QuickActionsWidget } from "./QuickActionsWidget";
import { RecentBookingsWidget } from "./RecentBookingsWidget";
import { ScreenAvailabilityWidget } from "./ScreenAvailabilityWidget";
import { StatsOverviewWidget } from "./StatsOverviewWidget";

export function WidgetRenderer({ id }: { id: WidgetId }) {
  switch (id) {
    case "stats-overview":
      return <StatsOverviewWidget />;
    case "quick-actions":
      return <QuickActionsWidget />;
    case "featured-booking":
      return <FeaturedBookingWidget />;
    case "equipment-pool":
      return <EquipmentPoolWidget />;
    case "recent-bookings":
      return <RecentBookingsWidget />;
    case "booking-queues":
      return <BookingQueuesWidget />;
    case "screen-availability":
      return <ScreenAvailabilityWidget />;
    case "onsite-deployments":
      return <OnsiteDeploymentsWidget />;
    default:
      return null;
  }
}
