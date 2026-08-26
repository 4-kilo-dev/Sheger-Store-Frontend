import type { BookingStatus } from "@/types/domain";

export const BOOKING_ACTION_LABELS: Record<string, string> = {
  "booking.confirm": "Confirm Booking",
  "assignment.assign_technician": "Assign Technician",
  "assignment.accept": "Accept Assignment",
  "bom.create": "Submit BOM to Operations",
  "inventory.checkout": "Check-out Gear",
  "eval.submit_internal": "Submit Event Evaluation",
  "inventory.checkin": "Check-in Gear",
  "inventory.checkout_reverse": "Reverse Checkout",
  "booking.cancel": "Cancel Booking",
  "booking.cancel_override": "Force Cancel",
  "booking.partial_return": "Partial Check-in",
  "booking.done": "Check-in Gear",
  "booking.force_done": "Force Done",
};

export interface BookingAction {
  id: string;
  label: string;
  variant: "primary" | "outline" | "destructive";
  requiresForm?: string;
  targetStatus: BookingStatus;
  permissionKey: string;
  reasonRequired?: boolean;
  requiresReason?: boolean;
  viaBypass?: boolean;
  actionId?: string;
}

export const ASSIGNMENT_ACTION_IDS = new Set([
  "booking.accept",
  "assignment.accept",
  "assignment.decline",
  "assignment_accept",
  "assignment_decline",
]);

export function resolveBookingAction(
  actionId: string | undefined,
  permissionKey: string,
  toStatus: BookingStatus,
  reasonRequired?: boolean,
  viaBypass?: boolean,
): BookingAction {
  const id = actionId || permissionKey;
  const isCancel = permissionKey.includes("cancel") || toStatus === "CANCELED";
  const isAssign =
    id === "assignment.assign_technician" ||
    id === "booking.assign" ||
    permissionKey === "assignment.assign_technician";
  const isCheckout =
    id === "inventory.checkout" ||
    id === "booking.checkout" ||
    permissionKey === "inventory.checkout";
  const isConfirm = id === "booking.confirm" || permissionKey === "booking.confirm";
  const isForceDone = id === "booking.force_done" || permissionKey === "booking.force_done";

  let requiresForm: string | undefined;
  if (isAssign) requiresForm = "assign";
  else if (isConfirm) requiresForm = "payment";
  else if (isCheckout) requiresForm = "dispatch";

  const label =
    BOOKING_ACTION_LABELS[id] ||
    BOOKING_ACTION_LABELS[permissionKey] ||
    id
      .split(/[._]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" ");

  return {
    id: isAssign ? "assignment.assign_technician" : id,
    label,
    variant: isCancel ? "destructive" : "primary",
    requiresForm,
    targetStatus: toStatus,
    permissionKey,
    reasonRequired: !!(reasonRequired || isCancel || isForceDone),
    requiresReason: !!(reasonRequired || isCancel || isForceDone),
    viaBypass,
    actionId,
  };
}

export function createAssignTechnicianAction(): BookingAction {
  return {
    id: "assignment.assign_technician",
    label: "Assign Technician",
    variant: "primary",
    requiresForm: "assign",
    targetStatus: "ASSIGNED",
    permissionKey: "assignment.assign_technician",
  };
}
