import type { UserRole } from "@/types/domain";

export type WidgetId =
  | "stats-overview"
  | "quick-actions"
  | "featured-booking"
  | "equipment-pool"
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
      "onsite-deployments",
    ],
    eyebrow: "Today's operations",
    title: "Dashboard",
    description: "Bookings, equipment, and crew at a glance.",
  },
  CCR: {
    widgets: ["stats-overview", "quick-actions", "booking-queues"],
    eyebrow: "Client relations",
    title: "Booking Intake & Payments",
    description: "Confirm reservations and follow up on outstanding payments.",
  },
  CTO: {
    widgets: ["stats-overview", "booking-queues", "screen-availability"],
    eyebrow: "Technical operations",
    title: "Screen Config & Crew Assignment",
    description: "Review confirmed bookings, verify screen specs, and assign lead technicians.",
  },
  TO: {
    widgets: ["stats-overview", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description:
      "Accept assigned bookings, prepare the bill of materials, and run your field setups.",
  },
  OO: {
    widgets: ["stats-overview", "booking-queues", "onsite-deployments"],
    eyebrow: "Logistics & dispatch",
    title: "Transport, Crew & Site Ops",
    description: "Dispatch teams and vehicles, manage onsite operations, and approve meal budgets.",
  },
  SK: {
    widgets: ["stats-overview", "quick-actions", "booking-queues"],
    eyebrow: "Warehouse",
    title: "Inventory & Check-ins",
    description: "Verify equipment returns, process check-outs, and flag damage.",
  },
  SH: {
    widgets: ["stats-overview", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description:
      "Accept assigned bookings, prepare the bill of materials, and run your field setups.",
  },
  FL: {
    widgets: ["stats-overview", "booking-queues"],
    eyebrow: "Field operations",
    title: "Your Assignments & Prep",
    description:
      "Accept assigned bookings, prepare the bill of materials, and run your field setups.",
  },
};
