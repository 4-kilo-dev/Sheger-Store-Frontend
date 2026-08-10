import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { Booking } from "@/features/bookings/services/bookings.api";
import { getPoolAvailabilityApi } from "@/features/inventory/services/inventory.api";
import {
  getPoolAvailabilityWindow,
  type PoolAvailabilityEntry,
} from "@/features/bookings/utils/bookingAvailability";

export type InventoryPool = {
  id: string;
  name?: string;
  totalQuantity?: string | number;
  category?: { defaultBufferHours?: number; unit?: string };
  unit?: string;
};

export function readPoolStock(pool?: InventoryPool | null): number {
  if (!pool) return 0;
  const raw = pool.totalQuantity as unknown;
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Windowed availability for a focused set of pools (selected / staged / on BOM).
 * Warehouse stock always comes from pool.totalQuantity — never invent zeros for
 * pools we haven't checked yet.
 */
export function useBookingPoolAvailability(
  booking: Booking | undefined,
  pools: InventoryPool[],
  enabled: boolean,
  /** When set, only these pool IDs are fetched for windowed availability. */
  focusPoolIds?: string[]
) {
  const poolById = useMemo(() => {
    const map = new Map<string, InventoryPool>();
    pools.forEach((p) => map.set(p.id, p));
    return map;
  }, [pools]);

  const targetIds = useMemo(() => {
    // Explicit focus list (BOM): only check selected/staged/BOM pools.
    if (focusPoolIds !== undefined) {
      return [...new Set(focusPoolIds.filter((id) => poolById.has(id)))];
    }
    // No focus list (e.g. technical holds with a small screen-pool set): check all provided pools.
    return pools.map((p) => p.id);
  }, [focusPoolIds, poolById, pools]);

  const queries = useQueries({
    queries: targetIds.map((poolId) => {
      const pool = poolById.get(poolId);
      const bufferHours = pool?.category?.defaultBufferHours ?? 0;
      const window = booking ? getPoolAvailabilityWindow(booking, bufferHours) : null;
      const stock = readPoolStock(pool);

      return {
        queryKey: [
          "pool-availability",
          booking?.id,
          poolId,
          window?.from ?? "none",
          window?.to ?? "none",
        ],
        queryFn: async () => {
          if (!window) {
            return { available: stock, total: stock, stock };
          }
          const res = await getPoolAvailabilityApi(poolId, window.from, window.to);
          const total = Number(res.total);
          const hardAvailable = Number(res.available);
          // Backend `available` only subtracts HARD holds + damage. Technical holds
          // are SOFT, so planning UI must also subtract softReserved.
          const softReserved = Number(res.softReserved ?? 0);
          const planningAvailable = Number.isFinite(hardAvailable)
            ? Math.max(0, hardAvailable - (Number.isFinite(softReserved) ? softReserved : 0))
            : stock;
          return {
            available: planningAvailable,
            total: Number.isFinite(total) && total > 0 ? total : stock,
            stock,
          };
        },
        enabled: enabled && !!booking && !!poolId,
        staleTime: 30_000,
        retry: 1,
      };
    }),
  });

  const availabilityByPoolId = useMemo(() => {
    const map: Record<string, PoolAvailabilityEntry> = {};

    // Seed every known pool with warehouse stock so dropdowns never show fake 0s.
    pools.forEach((pool) => {
      const stock = readPoolStock(pool);
      map[pool.id] = {
        available: stock,
        total: stock,
        stock,
        loading: false,
      };
    });

    targetIds.forEach((poolId, index) => {
      const query = queries[index];
      const pool = poolById.get(poolId);
      const stock = readPoolStock(pool);
      if (query?.isLoading) {
        map[poolId] = {
          available: stock,
          total: stock,
          stock,
          loading: true,
        };
        return;
      }
      if (query?.isError || !query?.data) {
        map[poolId] = {
          available: stock,
          total: stock,
          stock,
          loading: false,
        };
        return;
      }
      map[poolId] = {
        available: query.data.available,
        total: query.data.total,
        stock,
        loading: false,
      };
    });

    return map;
  }, [pools, poolById, targetIds, queries]);

  const isLoading = queries.some((q) => q.isLoading);

  return { availabilityByPoolId, isLoading };
}
