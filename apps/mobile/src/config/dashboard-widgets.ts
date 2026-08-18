import type { UserRole } from "@/types/domain";

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

export interface RoleLayoutConfig {
  widgets: WidgetId[];
  eyebrow: string;
  title: string;
  description: string;
}

export const ROLE_LAYOUTS: Record<UserRole, RoleLayoutConfig> = {
  Admin: {
    widgets: [
      "stats-overview",
      "quick-actions",
      "featured-booking",
      "equipment-pool",
      "recent-bookings",
      "pending-tasks",
      "onsite-deployments",
    ],
    eyebrow: "Today's operations",
    title: "Dashboard",
    description: "What's live, what's next, and what needs a hand.",
  },
  CCR: {
    widgets: ["stats-overview", "quick-actions", "pending-tasks", "booking-queues"],
    eyebrow: "Client relations",
    title: "Booking Intake & Payments",
    description: "Confirm reservations and chase outstanding payments.",
  },
  CTO: {
    widgets: ["stats-overview", "pending-tasks", "booking-queues", "screen-availability"],
    eyebrow: "Technical operations",
    title: "Screen Config & Crew Assignment",
    description: "Review specs and assign the lead technician.",
  },
  TO: {
    widgets: ["stats-overview", "pending-tasks", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description: "Accept jobs, prep the BOM, and run the setup.",
  },
  OO: {
    widgets: ["stats-overview", "pending-tasks", "booking-queues", "onsite-deployments"],
    eyebrow: "Logistics & dispatch",
    title: "Transport, Crew & Site Ops",
    description: "Dispatch crews and vehicles. Keep the site moving.",
  },
  SK: {
    widgets: ["stats-overview", "quick-actions", "pending-tasks", "booking-queues"],
    eyebrow: "Warehouse",
    title: "Inventory & Check-ins",
    description: "Check gear out, take it back, flag damage.",
  },
  SH: {
    widgets: ["stats-overview", "pending-tasks", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description: "Accept jobs, prep the BOM, and run the setup.",
  },
  FL: {
    widgets: ["stats-overview", "pending-tasks", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description: "Accept jobs, prep the BOM, and run the setup.",
  },
};
