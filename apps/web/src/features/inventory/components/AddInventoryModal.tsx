import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createInventoryCategoryApi,
  createInventoryItemApi,
  createInventoryPoolApi,
  getInventoryCategoriesApi,
  type InventoryCategory,
} from "@/features/inventory/services/inventory.api";

type TrackingKind = "bulk" | "serialized";

function toCategoryKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

interface AddInventoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddInventoryModal({ open, onClose }: AddInventoryModalProps) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<TrackingKind>("bulk");
  const [categoryId, setCategoryId] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryUnit, setNewCategoryUnit] = useState("pcs");

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [condition, setCondition] = useState<"AVAILABLE" | "DAMAGED" | "UNDER_MAINTENANCE">("AVAILABLE");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: getInventoryCategoriesApi,
    enabled: open,
  });

  const matchingCategories = useMemo(
    () => categories.filter((c: InventoryCategory) => c.trackingType === kind && c.isActive !== false),
    [categories, kind]
  );

  useEffect(() => {
    if (!open) return;
    setCategoryId("");
    setCreatingCategory(matchingCategories.length === 0);
  }, [kind, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    if (categoryId && matchingCategories.some((c) => c.id === categoryId)) return;
    if (matchingCategories[0]) {
      setCategoryId(matchingCategories[0].id);
      setCreatingCategory(false);
    }
  }, [matchingCategories, categoryId, open]);

  const resetForm = () => {
    setKind("bulk");
    setCategoryId("");
    setCreatingCategory(false);
    setNewCategoryName("");
    setNewCategoryUnit("pcs");
    setName("");
    setQuantity("1");
    setSku("");
    setAssetTag("");
    setSerialNumber("");
    setNotes("");
    setCondition("AVAILABLE");
  };

  const invalidateInventory = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-pools"] });
  };

  const { mutateAsync: createCategory, isPending: creatingCat } = useMutation({
    mutationFn: createInventoryCategoryApi,
  });

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      const trimmedName = name.trim();
      if (!trimmedName) throw new Error("Name is required");

      let resolvedCategoryId = categoryId;

      if (creatingCategory) {
        const catName = newCategoryName.trim();
        if (!catName) throw new Error("Category name is required");
        const key = toCategoryKey(catName);
        if (!key) throw new Error("Category name must include letters or numbers");
        const created = await createCategory({
          key,
          name: catName,
          trackingType: kind,
          unit: kind === "bulk" ? newCategoryUnit.trim() || "pcs" : undefined,
        });
        resolvedCategoryId = created.id;
      }

      if (!resolvedCategoryId) throw new Error("Select or create a category");

      if (kind === "bulk") {
        const qty = parseFloat(quantity);
        if (!Number.isFinite(qty) || qty < 0) throw new Error("Quantity must be 0 or greater");
        return createInventoryPoolApi({
          categoryId: resolvedCategoryId,
          name: trimmedName,
          totalQuantity: quantity,
          sku: sku.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      }

      return createInventoryItemApi({
        categoryId: resolvedCategoryId,
        name: trimmedName,
        assetTag: assetTag.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        condition,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success(kind === "bulk" ? "Bulk pool added to inventory" : "Serialized item added to inventory");
      invalidateInventory();
      resetForm();
      onClose();
    },
    onError: (err: any) => {
      const msg =
        (Array.isArray(err?.data?.message) ? err.data.message.join(", ") : null) ||
        err?.data?.message ||
        err?.message ||
        "Failed to add inventory";
      toast.error(typeof msg === "string" ? msg : "Failed to add inventory");
    },
  });

  if (!open) return null;

  const busy = isPending || creatingCat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        role="dialog"
        aria-labelledby="add-inventory-title"
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
          <h3 id="add-inventory-title" className="text-[15px] font-bold">
            Add Inventory
          </h3>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="text-[12px] font-semibold hover:opacity-80"
            style={{ color: "var(--text-3)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--text-2)" }}>
              Tracking type
            </div>
            <div className="flex rounded-md border p-1" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <button
                type="button"
                onClick={() => setKind("bulk")}
                className="flex-1 rounded px-3 py-1.5 text-[11px] font-semibold transition"
                style={{
                  background: kind === "bulk" ? "var(--surface)" : "transparent",
                  color: kind === "bulk" ? "var(--foreground)" : "var(--text-2)",
                }}
              >
                Bulk pool
              </button>
              <button
                type="button"
                onClick={() => setKind("serialized")}
                className="flex-1 rounded px-3 py-1.5 text-[11px] font-semibold transition"
                style={{
                  background: kind === "serialized" ? "var(--surface)" : "transparent",
                  color: kind === "serialized" ? "var(--foreground)" : "var(--text-2)",
                }}
              >
                Serialized item
              </button>
            </div>
          </div>

          {!creatingCategory ? (
            <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
              Category
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={categoriesLoading || matchingCategories.length === 0}
                className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                style={{ borderColor: "var(--border)" }}
                aria-label="Inventory category"
              >
                {matchingCategories.length === 0 ? (
                  <option value="">No {kind} categories yet</option>
                ) : (
                  matchingCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.unit ? ` (${c.unit})` : ""}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() => setCreatingCategory(true)}
                className="mt-1.5 text-[11px] font-semibold"
                style={{ color: "var(--accent)" }}
              >
                + New category
              </button>
            </label>
          ) : (
            <div className="space-y-3 rounded-md border p-3" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold">New {kind} category</span>
                {matchingCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCreatingCategory(false)}
                    className="text-[11px] font-semibold"
                    style={{ color: "var(--accent)" }}
                  >
                    Use existing
                  </button>
                )}
              </div>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Category name
                <input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder={kind === "bulk" ? "e.g. Power/Data Cables" : "e.g. LED Controllers"}
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2.5 text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              {kind === "bulk" && (
                <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                  Unit
                  <input
                    value={newCategoryUnit}
                    onChange={(e) => setNewCategoryUnit(e.target.value)}
                    placeholder="pcs, m², …"
                    className="mt-1 h-9 w-full rounded border bg-[var(--surface)] px-2.5 text-[12px]"
                    style={{ borderColor: "var(--border)" }}
                  />
                </label>
              )}
            </div>
          )}

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={kind === "bulk" ? "e.g. Cat6 Waterproof Data Cable 10m" : "e.g. Novastar VX1000"}
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
              style={{ borderColor: "var(--border)" }}
              required
            />
          </label>

          {kind === "bulk" ? (
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
                  aria-label="Total quantity"
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                SKU (optional)
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. CBL-CAT6-10M"
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Asset tag (optional)
                <input
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  placeholder="e.g. CTRL-VX1000-003"
                  className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 font-mono text-[12px]"
                  style={{ borderColor: "var(--border)" }}
                />
              </label>
              <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                Serial number (optional)
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
                </select>
              </label>
            </div>
          )}

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Notes (optional)
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => submit()}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            {busy ? "Saving…" : kind === "bulk" ? "Add pool" : "Add item"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="rounded border px-4 py-2 text-[12px]"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
