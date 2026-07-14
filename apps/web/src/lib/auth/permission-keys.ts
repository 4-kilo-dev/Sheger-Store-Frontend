/**
 * Canonical permission keys for exact match vs `/auth/me` / login.
 * Backend expands shallow implications (manage⇒view, checkout⇒reserve) into the
 * returned array — do not reimplement those on the client.
 */
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
  /** Soft/hard holds — create/release reservations */
  INVENTORY_RESERVE: "inventory.reserve",
  INVENTORY_VIEW: "inventory.view",
  /** Warehouse check-out (PREPARATION → ONSITE) */
  INVENTORY_CHECKOUT: "inventory.checkout",
  INVENTORY_CHECKIN: "inventory.checkin",
  INVENTORY_CHECKOUT_REVERSE: "inventory.checkout_reverse",
  DAMAGE_REPORT: "damage.report",
  EVAL_SUBMIT_INTERNAL: "eval.submit_internal",
  EVAL_VIEW: "eval.view",
  PAYMENT_MANAGE: "payment.manage",
  /** Read staff list / user detail */
  USER_VIEW: "user.view",
  /** Create/update users, reset password, assign roles */
  USER_MANAGE: "user.manage",
  /** Read roles list, role detail, permission catalog */
  ROLE_VIEW: "role.view",
  ROLE_MANAGE: "role.manage",
} as const;

/** Human labels for role-editor / permission catalog UI (explicit DB grants). */
export const PERMISSION_LABELS: Record<string, string> = {
  "inventory.reserve": "Reserve / soft-hold",
  "inventory.checkout": "Warehouse checkout",
  "inventory.view": "View inventory & reservations",
  "user.view": "View staff",
  "user.manage": "Manage staff (write)",
  "role.view": "View roles & permission catalog",
  "role.manage": "Manage roles & permissions",
};

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];
