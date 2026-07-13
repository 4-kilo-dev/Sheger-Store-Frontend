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
  Undo2,
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

/** Presentation-only metadata keyed by backend `actionId` (not auth). */
export interface BookingActionUI {
  id: string;
  label: string;
  icon: LucideIcon;
  variant: "primary" | "outline" | "destructive";
  requiresForm?: string;
}

/** Action ready for the action bar / modal — transition + UI registry. */
export interface BookingAction extends BookingActionUI {
  targetStatus: BookingStatus;
  permissionKey: string;
  /** @deprecated prefer reasonRequired — kept for modal compat */
  requiresReason?: boolean;
  reasonRequired?: boolean;
  viaBypass?: boolean;
}

function ui(
  id: string,
  label: string,
  icon: LucideIcon,
  variant: BookingActionUI["variant"] = "primary",
  requiresForm?: string
): BookingActionUI {
  return { id, label, icon, variant, requiresForm };
}

/**
 * FE labels/icons/forms keyed by backend transition `actionId`
 * (see backend `transition-action-ids.ts`). Also keyed by permissionKey as fallback.
 * Auth comes from GET /bookings/:id/allowed-transitions — not role lists.
 */
export const BOOKING_ACTION_UI: Record<string, BookingActionUI> = {
  // Forward transitions (BE actionIds)
  "booking.confirm": ui("booking.confirm", "Confirm Booking", DollarSign, "primary", "payment"),
  "booking.assign": ui(
    "assignment.assign_technician",
    "Assign Technician",
    UserCheck,
    "primary",
    "assign"
  ),
  "booking.accept": ui("assignment.accept", "Accept Assignment", CheckCircle2),
  "booking.advance_preparation": ui("bom.create", "Submit BOM to Operations", Package),
  "booking.checkout": ui("inventory.checkout", "Check-out Gear", Truck, "primary", "dispatch"),
  "booking.complete": ui("eval.submit_internal", "Submit Event Evaluation", CheckCircle2),
  "booking.partial_return": ui("inventory.checkin", "Partial Check-in", PackageCheck, "outline"),
  "booking.done": ui("inventory.checkin", "Check-in Gear", PackageCheck, "outline"),
  "booking.checkout_reverse": ui(
    "inventory.checkout_reverse",
    "Reverse Checkout",
    Undo2,
    "outline"
  ),
  "booking.cancel": ui("booking.cancel", "Cancel Booking", X, "destructive"),
  "booking.cancel_override": ui(
    "booking.cancel_override",
    "Force Cancel",
    AlertTriangle,
    "destructive"
  ),

  // Reverse / undo edges
  "booking.unconfirm": ui("booking.confirm", "Revert to Reserved", Undo2, "outline"),
  "booking.unassign": ui("assignment.assign_technician", "Revert to Confirmed", Undo2, "outline"),
  "booking.revert_accept": ui("assignment.accept", "Revert to Assigned", Undo2, "outline"),
  "booking.revert_preparation": ui("bom.create", "Revert to Accepted", Undo2, "outline"),

  // Permission-key fallbacks (when actionId missing or unknown)
  "assignment.assign_technician": ui(
    "assignment.assign_technician",
    "Assign Technician",
    UserCheck,
    "primary",
    "assign"
  ),
  "assignment.accept": ui("assignment.accept", "Accept Assignment", CheckCircle2),
  "assignment.decline": ui("assignment.decline", "Decline", X, "outline"),
  "bom.create": ui("bom.create", "Prepare Checklist (BOM)", Package),
  "inventory.checkout": ui("inventory.checkout", "Check-out Gear", Truck, "primary", "dispatch"),
  "inventory.checkin": ui("inventory.checkin", "Check-in Gear", PackageCheck, "outline"),
  "inventory.checkout_reverse": ui(
    "inventory.checkout_reverse",
    "Reverse Checkout",
    Undo2,
    "outline"
  ),
  "eval.submit_internal": ui("eval.submit_internal", "Submit Event Evaluation", CheckCircle2),
};

/**
 * Status-transition edges that are actually assignment-row actions.
 * Hide from the status action bar — Field Ops banner + assignment APIs own them.
 */
export const ASSIGNMENT_ACTION_IDS = new Set([
  "booking.accept",
  "assignment.accept",
  "assignment.decline",
  "assignment_accept",
  "assignment_decline",
]);

export function resolveBookingActionUI(
  actionId: string | undefined,
  permissionKey: string,
  toStatus: BookingStatus
): BookingActionUI {
  if (actionId && BOOKING_ACTION_UI[actionId]) {
    return BOOKING_ACTION_UI[actionId];
  }
  if (BOOKING_ACTION_UI[permissionKey]) {
    return BOOKING_ACTION_UI[permissionKey];
  }

  const isCancel = permissionKey.includes("cancel") || toStatus === "CANCELED";
  return {
    id: actionId || permissionKey,
    label: (actionId || permissionKey)
      .split(/[._]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" "),
    icon: isCancel ? X : CheckCircle2,
    variant: isCancel ? "destructive" : "primary",
  };
}
