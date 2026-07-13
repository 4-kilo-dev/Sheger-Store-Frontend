import { Package, Trash2 } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";
import { useBookingBom } from "@/features/bookings/hooks/useBookingBom";

export function EquipmentTab({
  b,
  caps,
}: {
  b: Booking;
  caps: BookingCapabilities;
}) {
  const isEditable = caps.canEditBom;
  const bom = useBookingBom(b, isEditable);

  return (
    <div className="space-y-4">
      {isEditable && (
        <Section title="BOM Creator - Add Item" icon={Package}>
          <form onSubmit={bom.handleAddItem} className="flex flex-col md:flex-row items-end gap-3">
            <div className="flex-1 w-full">
              <label
                className="text-[11px] font-semibold block mb-1"
                style={{ color: "var(--text-2)" }}
              >
                Select Equipment / Pool
              </label>
              <select
                value={bom.selectedPoolId}
                onChange={(e) => bom.setSelectedPoolId(e.target.value)}
                className="h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">-- Choose Equipment --</option>
                {bom.pools.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category?.name || "General"})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-32">
              <label
                className="text-[11px] font-semibold block mb-1"
                style={{ color: "var(--text-2)" }}
              >
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={bom.addQty}
                onChange={(e) => bom.setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] text-right font-mono"
                style={{ borderColor: "var(--border)" }}
              />
            </div>
            <button
              type="submit"
              disabled={bom.addingLine}
              className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 h-9 flex items-center gap-1.5 shrink-0"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Add to BOM
            </button>
          </form>
        </Section>
      )}

      <Section title="Bill of Materials" icon={Package}>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="label-eyebrow pb-2 text-left">Line ID</th>
              <th className="label-eyebrow pb-2 text-left">Item Name</th>
              <th className="label-eyebrow pb-2 text-right">Quantity</th>
              {isEditable && <th className="label-eyebrow pb-2 text-center w-24">Actions</th>}
              <th className="label-eyebrow pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {b.bomItems.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditable ? 5 : 4}
                  className="py-6 text-center text-[12px]"
                  style={{ color: "var(--text-3)" }}
                >
                  No items in Bill of Materials. Add items using the BOM Creator above.
                </td>
              </tr>
            ) : (
              b.bomItems.map((it) => (
                <tr
                  key={it.id}
                  className="border-b last:border-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>
                    {it.id}
                  </td>
                  <td className="py-3">{it.name}</td>
                  <td className="py-3 text-right">
                    {isEditable ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            bom.updateBomLine({
                              lineId: it.id,
                              quantity: Math.max(1, it.qty - 1),
                            })
                          }
                          disabled={bom.updatingLine || it.qty <= 1}
                          className="h-6 w-6 rounded border bg-[var(--surface-2)] flex items-center justify-center text-[12px] transition hover:border-[var(--accent)] disabled:opacity-30"
                          style={{ borderColor: "var(--border)" }}
                        >
                          -
                        </button>
                        <span className="font-mono font-semibold w-10 text-center">{it.qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            bom.updateBomLine({ lineId: it.id, quantity: it.qty + 1 })
                          }
                          disabled={bom.updatingLine}
                          className="h-6 w-6 rounded border bg-[var(--surface-2)] flex items-center justify-center text-[12px] transition hover:border-[var(--accent)]"
                          style={{ borderColor: "var(--border)" }}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono font-semibold">{it.qty}</span>
                    )}
                  </td>
                  {isEditable && (
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remove ${it.name} from the BOM?`)) {
                            bom.deleteBomLine(it.id);
                          }
                        }}
                        disabled={bom.deletingLine}
                        className="text-destructive hover:scale-110 transition p-1"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                  <td className="py-3 text-right">
                    <span
                      className="rounded-md border px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        borderColor: "var(--border)",
                        color:
                          it.status === "Returned"
                            ? "var(--color-bom-returned)"
                            : it.status === "Checked Out"
                              ? "var(--color-bom-checkedout)"
                              : "var(--text-2)",
                      }}
                    >
                      {it.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div
          className="mt-4 flex items-center justify-between border-t pt-3 text-[11px]"
          style={{ borderColor: "var(--border)" }}
        >
          <span style={{ color: "var(--text-3)" }}>
            {b.bomItems.length} items · {b.bomItems.reduce((s, i) => s + i.qty, 0)} total units
          </span>
          <button
            className="rounded-md border px-3 py-1 text-[10px] font-semibold"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            Print Packing Slip
          </button>
        </div>
      </Section>
    </div>
  );
}
