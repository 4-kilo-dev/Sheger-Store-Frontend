import type { Booking } from "@/features/bookings/services/bookings.api";

function toIso(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

/** Base rental window aligned with backend computeWindow inputs. */
export function getBookingRentalWindow(
  booking: Pick<Booking, "rentalStart" | "rentalEnd" | "assemblyDate" | "dismantleDate" | "eventDate">
): { from: string; to: string } | null {
  // Prefer assembly → dismantle (ops window); fall back to rental / event dates.
  const start =
    booking.assemblyDate || booking.rentalStart || booking.eventDate;
  const end =
    booking.dismantleDate || booking.rentalEnd || booking.eventDate;
  if (!start || !end) return null;

  const from = new Date(toIso(start));
  const to = new Date(toIso(end));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

  // Same instant (common when only eventDate is set) → treat as through end of that day.
  if (from.getTime() === to.getTime()) {
    to.setHours(23, 59, 59, 999);
  }

  if (from > to) return null;

  return { from: from.toISOString(), to: to.toISOString() };
}

export function getPoolAvailabilityWindow(
  booking: Pick<Booking, "rentalStart" | "rentalEnd" | "assemblyDate" | "dismantleDate" | "eventDate">,
  bufferHours = 0
): { from: string; to: string } | null {
  const base = getBookingRentalWindow(booking);
  if (!base) return null;

  const from = new Date(base.from);
  const to = new Date(base.to);
  from.setTime(from.getTime() - bufferHours * 60 * 60 * 1000);
  to.setTime(to.getTime() + bufferHours * 60 * 60 * 1000);

  if (from >= to) return null;
  return { from: from.toISOString(), to: to.toISOString() };
}

export type AvailabilityStatus = "ok" | "warn" | "unknown";

export function getAvailabilityStatus(
  requested: number,
  available: number | null | undefined
): AvailabilityStatus {
  if (available == null || Number.isNaN(available)) return "unknown";
  return requested > available ? "warn" : "ok";
}

export interface PoolAvailabilityEntry {
  available: number;
  total: number;
  loading: boolean;
  /** Warehouse total from pool.totalQuantity (not windowed). */
  stock?: number;
}
