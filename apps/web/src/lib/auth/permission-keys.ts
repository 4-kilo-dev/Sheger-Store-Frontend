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
  BOOKING_FORCE_DONE: "booking.force_done",
  BOOKING_DELETE: "booking.delete",
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
  /** Add / edit / retire inventory categories, pools, and items */
  INVENTORY_MANAGE: "inventory.manage",
  /** Warehouse check-out (PREPARATION → ONSITE) */
  INVENTORY_CHECKOUT: "inventory.checkout",
  INVENTORY_CHECKIN: "inventory.checkin",
  INVENTORY_CHECKOUT_REVERSE: "inventory.checkout_reverse",
  INVENTORY_OVERRIDE_AVAILABILITY: "inventory.override_availability",
  INVENTORY_FORCE_CHECKIN: "inventory.force_checkin",
  INVENTORY_FORCE_CHECKOUT: "inventory.force_checkout",
  DAMAGE_REPORT: "damage.report",
  DAMAGE_RESOLVE: "damage.resolve",
  EVAL_SUBMIT_INTERNAL: "eval.submit_internal",
  EVAL_VIEW: "eval.view",
  REPORT_BUSINESS_VIEW: "report.business.view",
  PAYMENT_VIEW: "payment.view",
  PAYMENT_MANAGE: "payment.manage",
  /** Read staff list / user detail */
  USER_VIEW: "user.view",
  /** Create/update users, reset password, assign roles */
  USER_MANAGE: "user.manage",
  /** Read roles list, role detail, permission catalog */
  ROLE_VIEW: "role.view",
  ROLE_MANAGE: "role.manage",
  DRIVER_TRIP_CREATE: "driver_trip.create",
  DRIVER_TRIP_EDIT: "driver_trip.edit",
  DRIVER_TRIP_VIEW: "driver_trip.view",
  DRIVER_TRIP_APPROVE: "driver_trip.approve",
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",
  /** Configure notification event types and recipient routing. */
  NOTIFICATION_MANAGE: "notification.manage",
  /** Arm and execute a guarded disaster-recovery restore. */
  SYSTEM_RESTORE: "system.restore",
} as const;

/** Human labels for role-editor / permission catalog UI (explicit DB grants). */
export const PERMISSION_LABELS: Record<string, string> = {
  "inventory.reserve": "Reserve / soft-hold",
  "inventory.checkout": "Warehouse checkout",
  "inventory.view": "View inventory & reservations",
  "inventory.manage": "Manage inventory (add / edit)",
  "user.view": "View staff",
  "user.manage": "Manage staff (write)",
  "role.view": "View roles & permission catalog",
  "role.manage": "Manage roles & permissions",
  "booking.delete": "Hard-delete booking & associated data",
  "booking.force_done": "Force a booking to DONE without check-in or evaluation",
  "payment.view": "View booking payment status",
  "payment.manage": "Manage payments, rates & financial details",
  "report.business.view": "View revenue, booking & client reports",
  "notification.manage": "Manage notification events and routing",
  "system.restore": "Restore a verified system backup",
  "driver_trip.create": "Create driver trips",
  "driver_trip.edit": "Edit driver trips",
  "driver_trip.view": "View driver trips",
  "driver_trip.approve": "Approve / reject driver trips",
};

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];
