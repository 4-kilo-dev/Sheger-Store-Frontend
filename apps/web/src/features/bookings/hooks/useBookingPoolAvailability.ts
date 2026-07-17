import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Booking } from "@/features/bookings/services/bookings.api";
import { getPoolAvailabilityApi } from "@/features/inventory/services/inventory.api";
import {
  getPoolAvailabilityWindow,
  type PoolAvailabilityEntry,
} from "@/features/bookings/utils/bookingAvailability";

type InventoryPool = {
  id: string;
  category?: { defaultBufferHours?: number };
};

export function useBookingPoolAvailability(
  booking: Booking | undefined,
  pools: InventoryPool[],
  enabled: boolean
) {
  const poolIds = useMemo(() => pools.map((p) => p.id), [pools]);

  const queries = useQueries({
    queries: poolIds.map((poolId) => {
      const pool = pools.find((p) => p.id === poolId);
      const bufferHours = pool?.category?.defaultBufferHours ?? 0;
      const window = booking ? getPoolAvailabilityWindow(booking, bufferHours) : null;

      return {
        queryKey: [
          "pool-availability",
          booking?.id,
          poolId,
          window?.from,
          window?.to,
        ],
        queryFn: async () => {
          if (!window) return { available: 0, total: 0 };
          const res = await getPoolAvailabilityApi(poolId, window.from, window.to);
          return {
            available: Number(res.available ?? res.total ?? 0),
            total: Number(res.total ?? 0),
          };
        },
        enabled: enabled && !!booking && !!window && poolIds.length > 0,
        staleTime: 30_000,
      };
    }),
  });

  const availabilityByPoolId = useMemo(() => {
    const map: Record<string, PoolAvailabilityEntry> = {};
    poolIds.forEach((poolId, index) => {
      const query = queries[index];
      map[poolId] = {
        available: query.data?.available ?? 0,
        total: query.data?.total ?? 0,
        loading: query.isLoading,
      };
    });
    return map;
  }, [poolIds, queries]);

  const isLoading = queries.some((q) => q.isLoading);

  return { availabilityByPoolId, isLoading };
}
