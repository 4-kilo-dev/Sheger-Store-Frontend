import { toast } from "sonner";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";

interface DamageReportModalProps {
  checkoutSnapshot: any;
  actions: ReturnType<typeof useBookingActions>;
}

export function DamageReportModal({ checkoutSnapshot, actions }: DamageReportModalProps) {
  const {
    showDamageModal,
    setShowDamageModal,
    damageDescription,
    setDamageDescription,
    damageType,
    setDamageType,
    damageSelectedAssetId,
    setDamageSelectedAssetId,
    damageQty,
    setDamageQty,
    submitDamageReport,
    submittingDamage,
  } = actions;

  if (!showDamageModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b pb-3 mb-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-[15px] font-bold text-destructive">Report Damaged / Missing Gear</h3>
          <button
            onClick={() => setShowDamageModal(false)}
            className="text-[12px] font-semibold hover:opacity-80"
            style={{ color: "var(--text-3)" }}
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Report Type
            <select
              value={damageType}
              onChange={(e) => setDamageType(e.target.value as any)}
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="DAMAGE">Damaged / Broken</option>
              <option value="MISSING">Missing / Lost</option>
            </select>
          </label>

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Equipment Item (Checked-out)
            <select
              value={damageSelectedAssetId}
              onChange={(e) => setDamageSelectedAssetId(e.target.value)}
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px]"
              style={{ borderColor: "var(--border)" }}
            >
              <option value="">-- Choose Checked-out Equipment --</option>
              {checkoutSnapshot?.lines?.map((line: any) => {
                const key = line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`;
                const name =
                  line.item?.name || line.pool?.name || `Gear (id: ${line.poolId || line.itemId})`;
                return (
                  <option key={key} value={key}>
                    {name} ({line.quantity} units loaded)
                  </option>
                );
              })}
            </select>
          </label>

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Quantity Affected
            <input
              type="number"
              min="1"
              value={damageQty}
              onChange={(e) => setDamageQty(e.target.value)}
              className="mt-1 h-9 w-full rounded border bg-[var(--surface-2)] px-2.5 text-[12px] font-mono"
              style={{ borderColor: "var(--border)" }}
            />
          </label>

          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Description of Incident
            <textarea
              value={damageDescription}
              onChange={(e) => setDamageDescription(e.target.value)}
              placeholder="Describe visible damage, symptoms, or how items went missing..."
              className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-24 block resize-none"
              style={{ borderColor: "var(--border)" }}
            />
          </label>
        </div>
        <div
          className="mt-5 flex items-center gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => {
              if (!damageSelectedAssetId) {
                toast.error("Please select an equipment item");
                return;
              }
              const [assetType, assetId] = damageSelectedAssetId.split(":");
              submitDamageReport({
                poolId: assetType === "pool" ? assetId : undefined,
                itemId: assetType === "item" ? assetId : undefined,
                reportType: damageType,
                quantity: damageQty,
                description: damageDescription,
              });
            }}
            disabled={submittingDamage || !damageDescription.trim()}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--destructive)", color: "#fff" }}
          >
            {submittingDamage ? "Submitting..." : "Submit Report"}
          </button>
          <button
            onClick={() => setShowDamageModal(false)}
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
