import { BookingStatus } from "@/features/bookings/services/bookings.api";

export type WidgetId =
  | "stats-overview"
  | "quick-actions"
  | "featured-booking"
  | "equipment-pool"
  | "pending-tasks"
  | "recent-bookings"
  | "booking-queues"
  | "screen-availability"
  | "onsite-deployments";

export interface WidgetMeta {
  id: WidgetId;
  title: string;
  defaultColSpan: number; // 12-column grid system
}

export const WIDGET_REGISTRY: Record<WidgetId, WidgetMeta> = {
  "stats-overview": { id: "stats-overview", title: "Operational Overview", defaultColSpan: 12 },
  "quick-actions": { id: "quick-actions", title: "Quick Actions", defaultColSpan: 12 },
  "featured-booking": { id: "featured-booking", title: "Active Preparation", defaultColSpan: 8 },
  "equipment-pool": { id: "equipment-pool", title: "Equipment Pool", defaultColSpan: 4 },
  "pending-tasks": { id: "pending-tasks", title: "Task Center", defaultColSpan: 4 },
  "recent-bookings": { id: "recent-bookings", title: "Recent Bookings", defaultColSpan: 12 },
  "booking-queues": { id: "booking-queues", title: "Work Queues", defaultColSpan: 12 },
  "screen-availability": { id: "screen-availability", title: "Screen Availability", defaultColSpan: 12 },
  "onsite-deployments": { id: "onsite-deployments", title: "Active Onsite", defaultColSpan: 12 },
};

// Maps backend role keys to ordered widget lists
export const ROLE_LAYOUTS: Record<string, WidgetId[]> = {
  admin: [
    "stats-overview",
    "quick-actions",
    "featured-booking",
    "equipment-pool",
    "pending-tasks",
    "recent-bookings",
    "onsite-deployments",
  ],
  supervisor: [
    "stats-overview",
    "quick-actions",
    "featured-booking",
    "equipment-pool",
    "pending-tasks",
    "recent-bookings",
    "onsite-deployments",
  ],
  ccr: ["stats-overview", "quick-actions", "booking-queues"],
  chief_tech: ["stats-overview", "booking-queues", "screen-availability"],
  technician: ["stats-overview", "booking-queues"],
  oo: ["stats-overview", "booking-queues", "onsite-deployments"],
  storekeeper: ["stats-overview", "quick-actions", "equipment-pool", "booking-queues"],
  stagehand: ["stats-overview", "booking-queues"],
  freelancer: ["stats-overview", "booking-queues"],
};
