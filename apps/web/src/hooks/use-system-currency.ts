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

  return { currency, formatMoney };
}
