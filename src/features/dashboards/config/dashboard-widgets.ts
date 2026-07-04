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
export interface RoleLayoutConfig {
  widgets: WidgetId[];
  title?: string;
  eyebrow?: string;
  description?: string;
}

export const ROLE_LAYOUTS: Record<string, RoleLayoutConfig> = {
  admin: {
    widgets: ["stats-overview", "quick-actions", "featured-booking", "equipment-pool", "recent-bookings", "onsite-deployments"],
    eyebrow: "Today's operations",
    title: "Dashboard",
    description: "Bookings, equipment, and crew at a glance."
  },
  ccr: {
    widgets: ["stats-overview", "quick-actions", "booking-queues"],
    eyebrow: "Client relations",
    title: "Booking Intake & Payments",
    description: "Confirm reservations and follow up on outstanding payments."
  },
  chief_tech: {
    widgets: ["stats-overview", "booking-queues", "screen-availability"],
    eyebrow: "Technical operations",
    title: "Screen Config & Crew Assignment",
    description: "Review confirmed bookings, verify screen specs, and assign lead technicians."
  },
  storekeeper: {
    widgets: ["stats-overview", "quick-actions", "booking-queues"],
    eyebrow: "Warehouse",
    title: "Inventory & Check-ins",
    description: "Verify equipment returns, process check-outs, and flag damage."
  },
  oo: {
    widgets: ["stats-overview", "booking-queues", "onsite-deployments"],
    eyebrow: "Logistics & dispatch",
    title: "Transport, Crew & Site Ops",
    description: "Dispatch teams and vehicles, manage onsite operations, and approve meal budgets."
  },
  technician: {
    widgets: ["stats-overview", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description: "Accept assigned bookings, prepare the bill of materials, and run your field setups."
  }
  // Any role not in this list will automatically fallback to the generic layout!
};
