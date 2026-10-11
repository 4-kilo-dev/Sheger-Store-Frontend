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

/**
 * Square meters with thousands separators, e.g. 36.5 → "36.5", 12078.5 → "12,079".
 * Up to 2 decimals below 1,000; whole numbers above so the value fits a half-width stat card.
 */
export function formatSqm(value: number) {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  const rounded = safe >= 1_000 ? Math.round(safe) : Math.round(safe * 100) / 100;
  const [whole, fraction] = rounded
    .toFixed(2)
    .replace(/\.?0+$/, "")
    .split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}
