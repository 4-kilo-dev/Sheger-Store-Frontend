/** Canonical permission keys used by the web booking UI (exact match vs /auth/me). */
export const PERMISSION = {
  BOOKING_CREATE: "booking.create",
  BOOKING_EDIT: "booking.edit",
  BOOKING_CONFIRM: "booking.confirm",
  BOOKING_CANCEL: "booking.cancel",
  BOOKING_CANCEL_OVERRIDE: "booking.cancel_override",
  BOOKING_VIEW_ALL: "booking.view_all",
  BOOKING_VIEW_ASSIGNED: "booking.view_assigned",
  ASSIGNMENT_ASSIGN_TECHNICIAN: "assignment.assign_technician",
  ASSIGNMENT_ASSIGN_CREW: "assignment.assign_crew",
  ASSIGNMENT_ACCEPT: "assignment.accept",
  ASSIGNMENT_DECLINE: "assignment.decline",
  BOM_CREATE: "bom.create",
  INVENTORY_CHECKOUT: "inventory.checkout",
  INVENTORY_CHECKIN: "inventory.checkin",
  INVENTORY_CHECKOUT_REVERSE: "inventory.checkout_reverse",
  DAMAGE_REPORT: "damage.report",
  EVAL_SUBMIT_INTERNAL: "eval.submit_internal",
  EVAL_VIEW: "eval.view",
  PAYMENT_MANAGE: "payment.manage",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
} as const;

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];
