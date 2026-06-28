import { BOOKING_STATUS_LABELS, ROLE_PERMISSIONS } from "@vortex/config";
import type { BookingStatus, PaymentStatus, UserRole } from "@vortex/types";

export function formatDate(value: string | Date, locale = "en-ET") {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

export function formatCurrency(value: number, currency = "ETB", locale = "en-ET") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function canAccessRoute(role: UserRole, route: string) {
  return ROLE_PERMISSIONS[role].some((allowedRoute) => {
    if (allowedRoute === "/") return route === "/";
    return route.startsWith(allowedRoute);
  });
}

export function getBookingStatusLabel(status: BookingStatus) {
  return BOOKING_STATUS_LABELS[status];
}

export function getPaymentBalance(amount: number, status: PaymentStatus) {
  if (status === "PAID") return 0;
  if (status === "ADVANCE") return amount / 2;
  return amount;
}
