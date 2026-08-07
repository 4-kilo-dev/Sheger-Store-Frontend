import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  deactivateInventoryCategoryApi,
  getInventoryCategoriesApi,
  updateInventoryCategoryApi,
  type InventoryCategory,
} from "@/features/inventory/services/inventory.api";

interface ManageCategoriesModalProps {
  open: boolean;
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

export function ManageCategoriesModal({ open, onClose }: ManageCategoriesModalProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["inventory-categories"],
    queryFn: getInventoryCategoriesApi,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setEditName("");
      setEditUnit("");
    }
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
  };

  const { mutate: saveRename, isPending: saving } = useMutation({
    mutationFn: async () => {
      if (!editingId) throw new Error("No category selected");
      const name = editName.trim();
      if (!name) throw new Error("Category name is required");
      const cat = categories.find((c) => c.id === editingId);
      const payload: { name: string; unit?: string } = { name };
      if (cat?.trackingType === "bulk") {
        payload.unit = editUnit.trim() || undefined;
      }
      return updateInventoryCategoryApi(editingId, payload);
    },
    onSuccess: () => {
      toast.success("Category updated");
      invalidate();
      setEditingId(null);
    },
    onError: (err: any) => toast.error(apiErrorMessage(err, "Failed to rename category")),
  });

  const { mutate: remove, isPending: removing } = useMutation({
    mutationFn: (id: string) => deactivateInventoryCategoryApi(id),
    onSuccess: () => {
      toast.success("Category deactivated");
      invalidate();
      if (editingId) setEditingId(null);
    },
    onError: (err: any) => toast.error(apiErrorMessage(err, "Failed to delete category")),
  });

  if (!open) return null;

  const startEdit = (cat: InventoryCategory) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditUnit(cat.unit || "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl max-h-[85vh] flex flex-col"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        role="dialog"
        aria-labelledby="manage-categories-title"
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <h3 id="manage-categories-title" className="text-[15px] font-bold">
              Manage categories
            </h3>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-3)" }}>
              Rename or deactivate inventory categories
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

        <div className="overflow-y-auto flex-1 space-y-2 pr-1">
          {isLoading && (
            <p className="text-[12px] py-6 text-center" style={{ color: "var(--text-3)" }}>
              Loading categories…
            </p>
          )}
          {!isLoading && categories.length === 0 && (
            <p className="text-[12px] py-6 text-center" style={{ color: "var(--text-3)" }}>
              No active categories.
            </p>
          )}
          {categories.map((cat) => {
            const isEditing = editingId === cat.id;
            return (
              <div
                key={cat.id}
                className="rounded-md border p-3"
                style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                      Name
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="mt-1 h-8 w-full rounded border bg-[var(--surface)] px-2.5 text-[12px]"
                        style={{ borderColor: "var(--border)" }}
                        autoFocus
                      />
                    </label>
                    {cat.trackingType === "bulk" && (
                      <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                        Unit
                        <input
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          className="mt-1 h-8 w-full rounded border bg-[var(--surface)] px-2.5 text-[12px]"
                          style={{ borderColor: "var(--border)" }}
                          title="Cannot change unit once pools exist under this category"
                        />
                      </label>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => saveRename()}
                        className="rounded px-3 py-1.5 text-[11px] font-bold disabled:opacity-50"
                        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded border px-3 py-1.5 text-[11px]"
                        style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold truncate">{cat.name}</div>
                      <div className="mt-0.5 font-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                        {cat.key} · {cat.trackingType}
                        {cat.unit ? ` · ${cat.unit}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(cat)}
                      className="rounded border px-2.5 py-1 text-[11px] font-semibold"
                      style={{ borderColor: "var(--border)" }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      disabled={removing}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Deactivate category "${cat.name}"? It will no longer appear for new stock.`,
                          )
                        ) {
                          remove(cat.id);
                        }
                      }}
                      className="rounded border px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                      style={{ borderColor: "var(--destructive)", color: "var(--destructive)" }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
          <button
            type="button"
            onClick={onClose}
            className="rounded border px-4 py-2 text-[12px]"
            style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
