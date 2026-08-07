import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deactivateInventoryEntityApi,
  updateInventoryItemApi,
  updateInventoryPoolApi,
  type InventoryItem,
} from "@/features/inventory/services/inventory.api";

interface EditInventoryModalProps {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}

function apiErrorMessage(err: any, fallback: string): string {
  const msg =
    (Array.isArray(err?.data?.message) ? err.data.message.join(", ") : null) ||
    err?.data?.message ||
    err?.message ||
    fallback;
  return typeof msg === "string" ? msg : fallback;
}

export function EditInventoryModal({ open, item, onClose }: EditInventoryModalProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<"AVAILABLE" | "DAMAGED" | "UNDER_MAINTENANCE" | "LOST" | "RETIRED">(
    "AVAILABLE",
  );

  useEffect(() => {
    if (!open || !item) return;
    setName(item.name || "");
    setQuantity(String(item.total ?? 1));
    setSku(item.sku || "");
    setAssetTag(item.assetTag || "");
    setSerialNumber(item.serialNumber || "");
    setNotes(item.notes || "");
    setCondition(item.itemCondition || (item.condition === "DAMAGED" ? "DAMAGED" : "AVAILABLE"));
  }, [open, item]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-pools"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventoryItem"] });
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Name is required");

      if (item.entityKind === "pool") {
        const qty = parseFloat(quantity);
        if (!Number.isFinite(qty) || qty < 0) throw new Error("Quantity must be 0 or greater");
        return updateInventoryPoolApi(item.entityId, {
          name: trimmed,
          totalQuantity: quantity,
          sku: sku.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      return updateInventoryItemApi(item.entityId, {
        name: trimmed,
        assetTag: assetTag.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        condition,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(item?.entityKind === "pool" ? "Pool updated" : "Item updated");
      invalidate();
      onClose();
    },
    onError: (err: any) => toast.error(apiErrorMessage(err, "Failed to update inventory")),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: async () => {
      if (!item) throw new Error("No item selected");
      return deactivateInventoryEntityApi(item.entityKind, item.entityId);
    },
    onSuccess: () => {
      toast.success(item?.entityKind === "pool" ? "Pool removed from inventory" : "Item removed from inventory");
      invalidate();
      onClose();
    },
    onError: (err: any) => toast.error(apiErrorMessage(err, "Failed to delete inventory")),
  });

  if (!open || !item) return null;

  const busy = saving || removing;
  const isPool = item.entityKind === "pool";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        role="dialog"
        aria-labelledby="edit-inventory-title"
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h3 id="edit-inventory-title" className="text-[15px] font-bold">
              Edit {isPool ? "pool" : "item"}
            </h3>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-3)" }}>
              {item.category} · {item.id}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold hover:opacity-80"
            style={{ color: "var(--text-3)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
              style={{ borderColor: "var(--border)" }}
            />
          </label>

          {isPool ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Total quantity
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                SKU
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Asset tag
                <input
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Serial number
                <input
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="text-[11px] font-semibold block col-span-2" style={{ color: "var(--text-2)" }}>
                Condition
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as typeof condition)}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="DAMAGED">Damaged</option>
                  <option value="UNDER_MAINTENANCE">Under maintenance</option>
                  <option value="LOST">Lost</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </label>
            </div>
          )}

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => save()}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded border px-4 py-2 text-[12px]"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  `Remove "${item.name}" from active inventory? This hides it from lists (soft delete).`,
                )
              ) {
                remove();
              }
            }}
            className="ml-auto rounded border px-4 py-2 text-[12px] font-semibold disabled:opacity-50"
            style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
          >
            {removing ? "Removing…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
