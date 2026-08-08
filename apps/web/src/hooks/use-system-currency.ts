import { useQuery } from "@tanstack/react-query";
import { getSettingsApi } from "@/features/settings/services/settings.api";
import { formatCurrency } from "@vortex/utils";

export type SystemCurrency = "ETB" | "USD";

export function useSystemCurrency() {
  const { data } = useQuery({
    queryKey: ["system-settings"],
    queryFn: getSettingsApi,
    staleTime: 60_000,
  });

  const currency: SystemCurrency = data?.currency === "USD" ? "USD" : "ETB";

  const formatMoney = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    return formatCurrency(Number(value), currency);
  };

  /** Compact labels for dashboards / charts (e.g. 1.2M ETB). */
  const formatMoneyCompact = (value: number | null | undefined) => {
    if (value == null || !Number.isFinite(Number(value))) return "—";
    const n = Number(value);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${currency}`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ${currency}`;
    return formatMoney(n);
  };

  return { currency, formatMoney, formatMoneyCompact };
}
