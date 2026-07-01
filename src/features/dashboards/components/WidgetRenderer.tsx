import { lazy, Suspense } from "react";
import type { WidgetId } from "../config/dashboard-widgets";
import { PendingTasksWidget } from "@/features/notifications/components/PendingTasksWidget";

const StatsOverviewWidget = lazy(() => import("../widgets/StatsOverviewWidget"));
const QuickActionsWidget = lazy(() => import("../widgets/QuickActionsWidget"));
const FeaturedBookingWidget = lazy(() => import("../widgets/FeaturedBookingWidget"));
const EquipmentPoolWidget = lazy(() => import("../widgets/EquipmentPoolWidget"));
const RecentBookingsWidget = lazy(() => import("../widgets/RecentBookingsWidget"));
const BookingQueuesWidget = lazy(() => import("../widgets/BookingQueuesWidget"));
const ScreenAvailabilityWidget = lazy(() => import("../widgets/ScreenAvailabilityWidget"));
const OnsiteDeploymentsWidget = lazy(() => import("../widgets/OnsiteDeploymentsWidget"));

interface WidgetRendererProps {
  id: WidgetId;
}

export function WidgetRenderer({ id }: WidgetRendererProps) {
  return (
    <Suspense fallback={<div className="rounded-lg border p-5 animate-pulse h-24" style={{ borderColor: "var(--border)", background: "var(--surface)" }} />}>
      {(() => {
        switch (id) {
          case "stats-overview":
            return <StatsOverviewWidget />;
          case "quick-actions":
            return <QuickActionsWidget />;
          case "featured-booking":
            return <FeaturedBookingWidget />;
          case "equipment-pool":
            return <EquipmentPoolWidget />;
          case "pending-tasks":
            return <PendingTasksWidget />;
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
      })()}
    </Suspense>
  );
}
export default WidgetRenderer;
