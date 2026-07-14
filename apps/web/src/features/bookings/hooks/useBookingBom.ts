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

export interface StagedBomItem {
  poolId: string;
  name: string;
  quantity: number;
}

/** Shared BOM CRUD for EquipmentTab (and any future BOM surfaces). */
export function useBookingBom(booking: Booking, enabled: boolean) {
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [addQty, setAddQty] = useState(1);
  // Staging list so technicians can queue several pools before committing.
  const [staged, setStaged] = useState<StagedBomItem[]>([]);

  const { data: pools = [], isLoading: poolsLoading } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
    enabled,
  });

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

  // Commit every staged pool. There is no backend batch endpoint, so we fan out
  // one createBomLineApi call per item and tolerate partial failure.
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
        // Keep only the failed rows staged so the user can retry.
        setStaged((prev) => prev.filter((s) => failedPoolIds.has(s.poolId)));
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add items to BOM");
    },
  });

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
    setStaged((prev) => [
      ...prev,
      { poolId: selectedPoolId, name: pool?.name || "Equipment", quantity: addQty },
    ]);
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
    addBomLinesAsync(staged.map((s) => ({ poolId: s.poolId, quantity: s.quantity }))).catch(
      () => {
        /* handled in onError */
      }
    );
  };

  return {
    pools,
    poolsLoading,
    selectedPoolId,
    setSelectedPoolId,
    addQty,
    setAddQty,
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
