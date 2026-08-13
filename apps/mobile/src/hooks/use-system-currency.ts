import { useQuery } from "@tanstack/react-query";
import { formatCurrency as formatSharedCurrency } from "@vortex/utils";
import { getSettingsApi } from "@/services/settings.api";

export type SystemCurrency = "ETB" | "USD";

/**
 * Resolve display currency from system settings (same source as web).
 * Defaults to ETB when the setting is missing or unrecognized.
 */
export function useSystemCurrency() {
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettingsApi,
    staleTime: 60_000,
  });

  const currency: SystemCurrency = data?.currency === "USD" ? "USD" : "ETB";

  const formatMoney = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return formatSharedCurrency(Number(value), currency);
  };

  const formatMoneyCompact = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    const n = Number(value);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ${currency}`;
    return formatMoney(n);
  };

  return { currency, formatMoney, formatMoneyCompact };
}
