import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createBomLineApi,
  deleteBomLineApi,
  updateBomLineApi,
  type Booking,
} from "@/features/bookings/services/bookings.api";
import { getInventoryPoolsApi } from "@/features/inventory/services/inventory.api";
import { useBookingPoolAvailability } from "@/features/bookings/hooks/useBookingPoolAvailability";
import { getAvailabilityStatus } from "@/features/bookings/utils/bookingAvailability";

export interface StagedBomItem {
  poolId: string;
  name: string;
  quantity: number;
}

function warnIfOverAllocated(
  items: { poolId: string; name: string; quantity: number }[],
  availabilityByPoolId: Record<string, { available: number; loading: boolean }>
) {
  const over = items.filter((item) => {
    const avail = availabilityByPoolId[item.poolId];
    if (!avail || avail.loading) return false;
    return getAvailabilityStatus(item.quantity, avail.available) === "warn";
  });
  if (over.length === 0) return;
  toast.warning(
    `${over.length} item${over.length === 1 ? "" : "s"} exceed available stock for this event window. OO can adjust before checkout.`
  );
}

/** Shared BOM CRUD for EquipmentTab (and any future BOM surfaces). */
export function useBookingBom(booking: Booking, enabled: boolean) {
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [staged, setStaged] = useState<StagedBomItem[]>([]);

  const { data: pools = [], isLoading: poolsLoading } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
    enabled,
  });

  const { availabilityByPoolId, isLoading: availabilityLoading } = useBookingPoolAvailability(
    booking,
    pools,
    enabled
  );

  const selectedAvailability = selectedPoolId ? availabilityByPoolId[selectedPoolId] : undefined;
  const selectedOverAllocated =
    selectedAvailability &&
    !selectedAvailability.loading &&
    getAvailabilityStatus(addQty, selectedAvailability.available) === "warn";

  const { mutate: updateBomLine, isPending: updatingLine } = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateBomLineApi(booking.id, lineId, { quantity: String(quantity) }),
    onSuccess: () => {
      toast.success("BOM quantity updated");
      queryClient.invalidateQueries({ queryKey: ["booking", booking.code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update quantity");
    },
  });

  const { mutate: deleteBomLine, isPending: deletingLine } = useMutation({
    mutationFn: (lineId: string) => deleteBomLineApi(booking.id, lineId),
    onSuccess: () => {
      toast.success("Item removed from BOM");
      queryClient.invalidateQueries({ queryKey: ["booking", booking.code] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to remove item");
    },
  });

  const { mutateAsync: addBomLinesAsync, isPending: addingLines } = useMutation({
    mutationFn: async (items: { poolId: string; quantity: number }[]) => {
      const results = await Promise.allSettled(
        items.map((it) =>
          createBomLineApi(booking.id, { poolId: it.poolId, quantity: String(it.quantity) })
        )
      );
      const failedIdx = results
        .map((r, i) => (r.status === "rejected" ? i : -1))
        .filter((i) => i >= 0);
      return { failedIdx };
    },
    onSuccess: ({ failedIdx }, items) => {
      queryClient.invalidateQueries({ queryKey: ["booking", booking.code] });
      if (failedIdx.length === 0) {
        toast.success(`Added ${items.length} item${items.length === 1 ? "" : "s"} to BOM`);
        setStaged([]);
      } else {
        const failedPoolIds = new Set(failedIdx.map((i) => items[i].poolId));
        toast.error(`${failedIdx.length} of ${items.length} items failed to add. Please retry those.`);
        setStaged((prev) => prev.filter((s) => failedPoolIds.has(s.poolId)));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add items to BOM");
    },
  });

  const getPoolAvailabilityLabel = (poolId: string) => {
    const entry = availabilityByPoolId[poolId];
    if (!entry || entry.loading || availabilityLoading) return null;
    return entry.available;
  };

  const stageSelected = () => {
    if (!selectedPoolId) {
      toast.error("Please select an item pool");
      return;
    }
    if (addQty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }
    if (staged.some((s) => s.poolId === selectedPoolId)) {
      toast.error("That equipment is already staged. Adjust its quantity below.");
      return;
    }
    const pool = pools.find((p: any) => p.id === selectedPoolId);
    const nextItem = {
      poolId: selectedPoolId,
      name: pool?.name || "Equipment",
      quantity: addQty,
    };
    warnIfOverAllocated([nextItem], availabilityByPoolId);
    setStaged((prev) => [...prev, nextItem]);
    setSelectedPoolId("");
    setAddQty(1);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    stageSelected();
  };

  const setStagedQty = (poolId: string, quantity: number) => {
    setStaged((prev) =>
      prev.map((s) => (s.poolId === poolId ? { ...s, quantity: Math.max(1, quantity) } : s))
    );
  };

  const removeStaged = (poolId: string) => {
    setStaged((prev) => prev.filter((s) => s.poolId !== poolId));
  };

  const commitStaged = () => {
    if (staged.length === 0) {
      toast.error("Stage at least one item first");
      return;
    }
    warnIfOverAllocated(staged, availabilityByPoolId);
    addBomLinesAsync(staged.map((s) => ({ poolId: s.poolId, quantity: s.quantity }))).catch(
      () => {
        /* handled in onError */
      }
    );
  };

  const getLineAvailabilityStatus = (poolId: string | undefined, qty: number) => {
    if (!poolId) return "unknown" as const;
    const entry = availabilityByPoolId[poolId];
    if (!entry || entry.loading) return "unknown" as const;
    return getAvailabilityStatus(qty, entry.available);
  };

  return {
    pools,
    poolsLoading,
    availabilityByPoolId,
    availabilityLoading,
    selectedPoolId,
    setSelectedPoolId,
    addQty,
    setAddQty,
    selectedAvailability,
    selectedOverAllocated,
    getPoolAvailabilityLabel,
    getLineAvailabilityStatus,
    handleAddItem,
    staged,
    stageSelected,
    setStagedQty,
    removeStaged,
    commitStaged,
    addingLines,
    updateBomLine,
    updatingLine,
    deleteBomLine,
    deletingLine,
  };
}
