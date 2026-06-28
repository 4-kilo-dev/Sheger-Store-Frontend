export const APP_NAME = "Vortex Visual Operations";
export const COMPANY_NAME = "Vortex Visual";
export const DEFAULT_TIMEZONE = "Africa/Addis_Ababa";
export const DEFAULT_CURRENCY = "ETB";

export const ROLE_PERMISSIONS = {
  Admin: [
    "/",
    "/bookings",
    "/inventory",
    "/checkout",
    "/damage-report",
    "/staff",
    "/reports",
    "/settings",
  ],
  CCR: ["/", "/bookings", "/reports", "/settings"],
  CTO: ["/", "/bookings", "/staff", "/settings"],
  TO: ["/", "/bookings", "/checkout"],
  OO: ["/", "/bookings", "/checkout", "/staff", "/reports"],
  SK: ["/", "/checkout", "/damage-report", "/inventory"],
} as const;

export const BOOKING_STATUS_ORDER = [
  "RESERVED",
  "CONFIRMED",
  "ASSIGNED",
  "ACCEPTED",
  "PREPARATION",
  "ONSITE",
  "COMPLETED",
  "DONE",
] as const;

export const BOOKING_STATUS_LABELS = {
  RESERVED: "Reserved",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  PREPARATION: "Preparation",
  ONSITE: "Onsite",
  COMPLETED: "Completed",
  DONE: "Done",
} as const;
