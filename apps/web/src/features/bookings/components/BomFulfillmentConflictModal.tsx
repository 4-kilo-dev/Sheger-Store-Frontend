import { AlertTriangle, Package } from "lucide-react";
import { useState } from "react";

export interface UnfulfilledBomLine {
  lineId: string;
  poolId: string | null;
  itemId: string | null;
  name: string;
  requested: string;
  available: string;
  reason: string;
}

interface BomFulfillmentConflictModalProps {
  open: boolean;
  lines: UnfulfilledBomLine[];
  onClose: () => void;
  onGoToEquipment: () => void;
  canOverride?: boolean;
  onOverrideCheckout?: (reason: string) => void;
  isOverriding?: boolean;
}

export function BomFulfillmentConflictModal({
  open,
  lines,
  onClose,
  onGoToEquipment,
  canOverride = false,
  onOverrideCheckout,
  isOverriding = false,
}: BomFulfillmentConflictModalProps) {
  const [reason, setReason] = useState("");
  if (!open || lines.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: "color-mix(in oklab, var(--color-pay-advance) 15%, transparent)",
              color: "var(--color-pay-advance)",
            }}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-bold">Checkout blocked — insufficient stock</h3>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
              Some BOM lines exceed available inventory for this booking window. Adjust quantities
              on the Equipment tab before checking out.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[12px] font-semibold"
            style={{ color: "var(--text-3)" }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div
          className="mt-4 max-h-56 overflow-y-auto rounded border divide-y"
          style={{ borderColor: "var(--border)" }}
        >
          {lines.map((line) => (
            <div key={line.lineId} className="px-3 py-2.5 text-[12px]">
              <div className="font-semibold">{line.name}</div>
              <div className="mt-1 font-mono text-[11px]" style={{ color: "var(--text-2)" }}>
                Requested {line.requested} · Available {line.available}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                {line.reason}
              </div>
            </div>
          ))}
        </div>

        {canOverride && (
          <div className="mt-3">
            <label className="block text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
              Override reason (minimum 10 characters)
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why this checkout must proceed..."
                className="mt-1 block h-20 w-full resize-none rounded border bg-[var(--surface-2)] p-2 text-[12px]"
                style={{ borderColor: "var(--border)" }}
              />
            </label>
          </div>
        )}

        <div
          className="mt-5 flex items-center gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => {
              onClose();
              onGoToEquipment();
            }}
            className="inline-flex items-center gap-2 rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110"
            style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
          >
            <Package className="h-4 w-4" />
            Open Equipment tab
          </button>
          {canOverride && onOverrideCheckout && (
            <button
              type="button"
              onClick={() => onOverrideCheckout(reason.trim())}
              disabled={reason.trim().length < 10 || isOverriding}
              className="rounded px-4 py-2 text-[12px] font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--destructive)" }}
            >
              {isOverriding ? "Overriding..." : "Force Checkout"}
            </button>
          )}
          <button
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
