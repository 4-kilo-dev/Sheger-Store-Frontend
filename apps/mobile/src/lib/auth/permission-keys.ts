/**
 * Canonical permission keys for exact match vs `/api/auth/me` / login.
 * Mirrors apps/web/src/lib/auth/permission-keys.ts — keep in sync with web.
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
  INVENTORY_RESERVE: "inventory.reserve",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_MANAGE: "inventory.manage",
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
  PAYMENT_MANAGE: "payment.manage",
  USER_VIEW: "user.view",
  USER_MANAGE: "user.manage",
  ROLE_VIEW: "role.view",
  ROLE_MANAGE: "role.manage",
  DRIVER_TRIP_CREATE: "driver_trip.create",
  DRIVER_TRIP_EDIT: "driver_trip.edit",
  DRIVER_TRIP_VIEW: "driver_trip.view",
  DRIVER_TRIP_APPROVE: "driver_trip.approve",
  CUSTOMER_VIEW: "customer.view",
  CUSTOMER_MANAGE: "customer.manage",
  NOTIFICATION_MANAGE: "notification.manage",
} as const;

export type PermissionKey = (typeof PERMISSION)[keyof typeof PERMISSION];
