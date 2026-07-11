import type { LucideIcon } from "lucide-react";
import {
  DollarSign,
  X,
  UserCheck,
  CheckCircle2,
  Package,
  Truck,
  AlertTriangle,
  PackageCheck,
} from "lucide-react";
import type { BookingStatus } from "@/features/bookings/services/bookings.api";

export const TABS = [
  "Overview",
  "Schedule",
  "Team",
  "Equipment",
  "Payments",
  "Files",
  "Activity",
  "Evaluations",
] as const;

export type TabName = (typeof TABS)[number];

export interface BookingAction {
  id: string;
  label: string;
  icon: LucideIcon;
  targetStatus: BookingStatus;
  allowedRoles: string[];
  variant: "primary" | "outline" | "destructive";
  requiresReason?: boolean;
  requiresForm?: string;
  color?: string;
}

export const BOOKING_ACTIONS: Record<BookingStatus, BookingAction[]> = {
  RESERVED: [
    {
      id: "booking.confirm",
      label: "Confirm Booking",
      icon: DollarSign,
      targetStatus: "CONFIRMED",
      allowedRoles: ["admin", "supervisor", "ccr", "chief_tech"],
      variant: "primary",
      requiresForm: "payment",
    },
    {
      id: "booking.cancel",
      label: "Cancel Booking",
      icon: X,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"],
      variant: "destructive",
    },
  ],
  CONFIRMED: [
    {
      id: "assignment.assign_technician",
      label: "Assign Technician",
      icon: UserCheck,
      targetStatus: "ASSIGNED",
      allowedRoles: ["admin", "supervisor", "chief_tech"],
      variant: "primary",
      requiresForm: "assign",
    },
    {
      id: "booking.cancel",
      label: "Cancel Booking",
      icon: X,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"],
      variant: "destructive",
    },
  ],
  ASSIGNED: [
    {
      id: "assignment.accept",
      label: "Accept Assignment",
      icon: CheckCircle2,
      targetStatus: "ACCEPTED",
      allowedRoles: ["admin", "supervisor", "technician"],
      variant: "primary",
    },
    {
      id: "assignment.decline",
      label: "Decline",
      icon: X,
      targetStatus: "CONFIRMED",
      allowedRoles: ["admin", "supervisor", "technician"],
      variant: "outline",
      requiresReason: true,
    },
    {
      id: "booking.cancel",
      label: "Cancel Booking",
      icon: X,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"],
      variant: "destructive",
    },
  ],
  ACCEPTED: [
    {
      id: "bom.create",
      label: "Prepare Checklist (BOM)",
      icon: Package,
      targetStatus: "PREPARATION",
      allowedRoles: ["admin", "supervisor", "chief_tech"],
      variant: "primary",
    },
    {
      id: "booking.cancel",
      label: "Cancel Booking",
      icon: X,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor", "ccr", "chief_tech", "oo"],
      variant: "destructive",
    },
  ],
  PREPARATION: [
    {
      id: "inventory.checkout",
      label: "Check-out Gear",
      icon: Truck,
      targetStatus: "ONSITE",
      allowedRoles: ["admin", "supervisor", "storekeeper", "oo"],
      variant: "primary",
      requiresForm: "dispatch",
    },
    {
      id: "booking.cancel_override",
      label: "Force Cancel",
      icon: AlertTriangle,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor"],
      variant: "destructive",
      requiresReason: true,
    },
  ],
  ONSITE: [
    {
      id: "eval.submit_internal",
      label: "Submit Event Evaluation",
      icon: CheckCircle2,
      targetStatus: "COMPLETED",
      allowedRoles: [
        "admin",
        "supervisor",
        "chief_tech",
        "technician",
        "oo",
      ],
      variant: "primary",
    },
    {
      id: "inventory.checkin",
      label: "Check-in Gear",
      icon: PackageCheck,
      targetStatus: "DONE",
      allowedRoles: ["admin", "supervisor", "storekeeper", "oo"],
      variant: "outline",
    },
    {
      id: "booking.cancel_override",
      label: "Force Cancel",
      icon: AlertTriangle,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor"],
      variant: "destructive",
      requiresReason: true,
    },
  ],
  COMPLETED: [
    {
      id: "inventory.checkin",
      label: "Check-in Remaining Gear",
      icon: PackageCheck,
      targetStatus: "DONE",
      allowedRoles: ["admin", "supervisor", "storekeeper", "oo"],
      variant: "primary",
    },
    {
      id: "booking.cancel_override",
      label: "Force Cancel",
      icon: AlertTriangle,
      targetStatus: "CANCELED",
      allowedRoles: ["admin", "supervisor"],
      variant: "destructive",
      requiresReason: true,
    },
  ],
  PARTIALLY_RETURNED: [
    {
      id: "inventory.checkin",
      label: "Check-in Remaining Gear",
      icon: PackageCheck,
      targetStatus: "DONE",
      allowedRoles: ["admin", "supervisor", "storekeeper", "oo"],
      variant: "primary",
    },
    {
      id: "inventory.checkout",
      label: "Check-out Equipment",
      icon: Truck,
      targetStatus: "ONSITE",
      allowedRoles: ["admin", "supervisor", "storekeeper", "oo"],
      variant: "outline",
    },
  ],
  DONE: [],
  CANCELED: [],
};
