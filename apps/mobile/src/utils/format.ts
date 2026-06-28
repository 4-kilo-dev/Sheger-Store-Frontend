export function formatCurrency(value: number) {
  return `ETB ${value.toLocaleString()}`;
}

export function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ETB`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K ETB`;
  return formatCurrency(value);
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
