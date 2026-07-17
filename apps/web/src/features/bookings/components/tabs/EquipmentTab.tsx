import { AlertTriangle, Package, Plus, Trash2, X } from "lucide-react";
import { Section } from "@/features/bookings/components/shared/Section";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { BookingCapabilities } from "@/features/bookings/hooks/useBookingCapabilities";
import { useBookingBom } from "@/features/bookings/hooks/useBookingBom";

function AvailabilityHint({
  available,
  loading,
  requested,
}: {
  available: number | null;
  loading: boolean;
  requested?: number;
}) {
  if (loading) {
    return (
      <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
        Checking…
      </span>
    );
  }
  if (available == null) return null;

  const over = requested != null && requested > available;
  return (
    <span
      className="text-[10px] font-semibold"
      style={{ color: over ? "var(--color-pay-advance)" : "var(--color-bom-returned)" }}
    >
      Avail: {available}
      {over ? " · Over-allocated" : ""}
    </span>
  );
}

export function EquipmentTab({
  b,
  caps,
}: {
  b: Booking;
  caps: BookingCapabilities;
}) {
  const isEditable = caps.canEditBom;
  const bom = useBookingBom(b, true);

  return (
    <div className="space-y-4">
      {isEditable && (
        <Section title="BOM Creator - Add Items" icon={Package}>
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
                aria-label="Select equipment pool"
                className="h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">-- Choose Equipment --</option>
                {bom.pools
                  .filter((p: any) => !bom.staged.some((s) => s.poolId === p.id))
                  .map((p: any) => {
                    const avail = bom.getPoolAvailabilityLabel(p.id);
                    const availLabel =
                      avail != null ? ` — ${avail} ${p.unit || p.category?.unit || "avail"}` : "";
                    return (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category?.name || "General"}){availLabel}
                      </option>
                    );
                  })}
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
                aria-label="Quantity to stage"
                className="h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] text-right font-mono"
                style={{ borderColor: "var(--border)" }}
              />
              {bom.selectedPoolId && (
                <div className="mt-1 text-right">
                  <AvailabilityHint
                    available={
                      bom.selectedAvailability?.loading
                        ? null
                        : bom.selectedAvailability?.available ?? null
                    }
                    loading={!!bom.selectedAvailability?.loading || bom.availabilityLoading}
                    requested={bom.addQty}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 h-9 flex items-center gap-1.5 shrink-0 border"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Stage Item
            </button>
          </form>

          {bom.selectedOverAllocated && (
            <div
              className="mt-3 flex items-start gap-2 rounded border px-3 py-2 text-[11px]"
              style={{
                borderColor: "color-mix(in oklab, var(--color-pay-advance) 40%, var(--border))",
                color: "var(--color-pay-advance)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Quantity exceeds available stock for this event window. You can still stage it; OO
                can adjust before checkout.
              </span>
            </div>
          )}

          {bom.staged.length > 0 && (
            <div className="mt-4 rounded-md border" style={{ borderColor: "var(--border)" }}>
              <div
                className="flex items-center justify-between border-b px-3 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="label-eyebrow">Staged Items ({bom.staged.length})</span>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {bom.staged.map((s) => {
                  const entry = bom.availabilityByPoolId[s.poolId];
                  const over =
                    entry &&
                    !entry.loading &&
                    bom.getLineAvailabilityStatus(s.poolId, s.quantity) === "warn";
                  return (
                    <div key={s.poolId} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium block truncate">{s.name}</span>
                        <AvailabilityHint
                          available={entry?.loading ? null : entry?.available ?? null}
                          loading={!!entry?.loading}
                          requested={s.quantity}
                        />
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={s.quantity}
                        onChange={(e) =>
                          bom.setStagedQty(s.poolId, Math.max(1, parseInt(e.target.value) || 1))
                        }
                        aria-label={`Quantity for ${s.name}`}
                        className="h-8 w-20 rounded border bg-[var(--surface-2)] px-2 text-right font-mono text-[12px]"
                        style={{
                          borderColor: over ? "var(--color-pay-advance)" : "var(--border)",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => bom.removeStaged(s.poolId)}
                        className="p-1 text-destructive hover:scale-110 transition"
                        title="Remove from staging"
                        aria-label={`Remove ${s.name} from staging`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <div
                className="flex items-center justify-end gap-2 border-t px-3 py-2"
                style={{ borderColor: "var(--border)" }}
              >
                <button
                  type="button"
                  onClick={bom.commitStaged}
                  disabled={bom.addingLines}
                  className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  {bom.addingLines ? "Adding..." : `Add all ${bom.staged.length} to BOM`}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}

      <Section title="Bill of Materials" icon={Package}>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="label-eyebrow pb-2 text-left">Line ID</th>
              <th className="label-eyebrow pb-2 text-left">Item Name</th>
              <th className="label-eyebrow pb-2 text-right">Quantity</th>
              <th className="label-eyebrow pb-2 text-right">Availability</th>
              {isEditable && <th className="label-eyebrow pb-2 text-center w-24">Actions</th>}
              <th className="label-eyebrow pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {b.bomItems.length === 0 ? (
              <tr>
                <td
                  colSpan={isEditable ? 6 : 5}
                  className="py-6 text-center text-[12px]"
                  style={{ color: "var(--text-3)" }}
                >
                  No items in Bill of Materials. Add items using the BOM Creator above.
                </td>
              </tr>
            ) : (
              b.bomItems.map((it) => {
                const entry = it.poolId ? bom.availabilityByPoolId[it.poolId] : undefined;
                const over =
                  it.poolId &&
                  entry &&
                  !entry.loading &&
                  bom.getLineAvailabilityStatus(it.poolId, it.qty) === "warn";
                return (
                  <tr
                    key={it.id}
                    className="border-b last:border-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="py-3 font-mono font-bold" style={{ color: "var(--accent)" }}>
                      {it.id}
                    </td>
                    <td className="py-3">
                      <div>{it.name}</div>
                      {over && (
                        <span
                          className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold"
                          style={{ color: "var(--color-pay-advance)" }}
                        >
                          <AlertTriangle className="h-3 w-3" /> Over-allocated
                        </span>
                      )}
                    </td>
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
                    <td className="py-3 text-right font-mono text-[11px]">
                      {it.poolId ? (
                        entry?.loading || bom.availabilityLoading ? (
                          <span style={{ color: "var(--text-3)" }}>…</span>
                        ) : (
                          <span style={{ color: over ? "var(--color-pay-advance)" : "var(--text-2)" }}>
                            {it.qty} / {entry?.available ?? "—"}
                          </span>
                        )
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>—</span>
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
                );
              })
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
