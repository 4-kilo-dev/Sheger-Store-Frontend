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

/** Shared BOM CRUD for EquipmentTab (and any future BOM surfaces). */
export function useBookingBom(booking: Booking, enabled: boolean) {
  const queryClient = useQueryClient();
  const [selectedPoolId, setSelectedPoolId] = useState("");
  const [addQty, setAddQty] = useState(1);

  const { data: pools = [], isLoading: poolsLoading } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
    enabled,
  });

  const { mutate: addBomLine, isPending: addingLine } = useMutation({
    mutationFn: ({ poolId, quantity }: { poolId: string; quantity: number }) =>
      createBomLineApi(booking.id, { poolId, quantity: String(quantity) }),
    onSuccess: () => {
      toast.success("Item added to BOM");
      queryClient.invalidateQueries({ queryKey: ["booking", booking.code] });
      setSelectedPoolId("");
      setAddQty(1);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add item to BOM");
    },
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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoolId) {
      toast.error("Please select an item pool");
      return;
    }
    if (addQty <= 0) {
      toast.error("Quantity must be at least 1");
      return;
    }
    addBomLine({ poolId: selectedPoolId, quantity: addQty });
  };

  return {
    pools,
    poolsLoading,
    selectedPoolId,
    setSelectedPoolId,
    addQty,
    setAddQty,
    handleAddItem,
    addBomLine,
    addingLine,
    updateBomLine,
    updatingLine,
    deleteBomLine,
    deletingLine,
  };
}
