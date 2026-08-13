import { formatCurrency as formatSharedCurrency } from "@vortex/utils";

/** Default ETB formatter for call sites that don't need the settings hook. */
export function formatCurrency(value: number, currency: "ETB" | "USD" = "ETB") {
  return formatSharedCurrency(value, currency);
}

export function formatCompactCurrency(value: number, currency: "ETB" | "USD" = "ETB") {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${currency}`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K ${currency}`;
  return formatCurrency(value, currency);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function daysUntil(date: string) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

export function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
