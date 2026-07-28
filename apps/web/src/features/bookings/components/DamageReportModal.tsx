import { useMemo, useRef } from "react";
import { Camera, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import type { Booking } from "@/features/bookings/services/bookings.api";
import type { useBookingActions } from "@/features/bookings/hooks/useBookingActions";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

interface EquipmentOption {
  key: string;
  label: string;
  quantity: number;
}

interface DamageReportModalProps {
  booking: Booking;
  checkoutSnapshot: any;
  actions: ReturnType<typeof useBookingActions>;
}

function buildEquipmentOptions(booking: Booking, checkoutSnapshot: any): EquipmentOption[] {
  if (checkoutSnapshot?.lines?.length) {
    return checkoutSnapshot.lines.map((line: any) => {
      const key = line.poolId ? `pool:${line.poolId}` : `item:${line.itemId}`;
      const name =
        line.item?.name || line.pool?.name || `Gear (id: ${line.poolId || line.itemId})`;
      return {
        key,
        label: name,
        quantity: parseFloat(line.quantity) || 1,
      };
    });
  }

  return booking.bomItems
    .filter((item) => item.poolId || item.itemId)
    .map((item) => ({
      key: item.poolId ? `pool:${item.poolId}` : `item:${item.itemId}`,
      label: `${item.code} · ${item.name}`,
      quantity: item.qty,
    }));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DamageReportModal({
  booking,
  checkoutSnapshot,
  actions,
}: DamageReportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    damageAttachments,
    setDamageAttachments,
    submitDamageReport,
    submittingDamage,
  } = actions;

  const equipmentOptions = useMemo(
    () => buildEquipmentOptions(booking, checkoutSnapshot),
    [booking, checkoutSnapshot]
  );

  if (!showDamageModal) return null;

  const closeModal = () => {
    setShowDamageModal(false);
    setDamageAttachments([]);
  };

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;

    const next: File[] = [...damageAttachments];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 20MB limit.`);
        continue;
      }
      if (next.length >= MAX_ATTACHMENTS) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per report.`);
        break;
      }
      if (next.some((f) => f.name === file.name && f.size === file.size)) continue;
      next.push(file);
    }
    setDamageAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setDamageAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-lg border p-5 shadow-xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b pb-3 mb-4"
          style={{ borderColor: "var(--border)" }}
        >
          <h3 className="text-[15px] font-bold text-destructive">Report Damaged / Missing Gear</h3>
          <button
            onClick={closeModal}
            className="text-[12px] font-semibold hover:opacity-80"
            style={{ color: "var(--text-3)" }}
          >
            ✕
          </button>
        </div>

        <div
          className="mb-4 rounded-md border px-3 py-2.5"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>
            Linked Booking
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>
              {booking.code}
            </span>
            <span className="font-semibold">{booking.client}</span>
            <span style={{ color: "var(--text-2)" }}>{booking.venue}</span>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
            Report Type
            <select
              value={damageType}
              onChange={(e) => setDamageType(e.target.value as "DAMAGE" | "MISSING")}
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
              {equipmentOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} ({option.quantity} units loaded)
                </option>
              ))}
            </select>
            {equipmentOptions.length === 0 && (
              <span className="mt-1 block text-[10px]" style={{ color: "var(--text-3)" }}>
                No checked-out equipment found for this booking.
              </span>
            )}
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

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>
                Photo / File Attachments
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                {damageAttachments.length}/{MAX_ATTACHMENTS} · up to 20MB each
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.zip,application/pdf,application/zip"
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={damageAttachments.length >= MAX_ATTACHMENTS || submittingDamage}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-3 py-4 text-[11px] font-semibold transition hover:border-[var(--accent)] disabled:opacity-50"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              <Camera className="h-4 w-4" style={{ color: "var(--destructive)" }} />
              Add photos or documents
            </button>

            {damageAttachments.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {damageAttachments.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 rounded border px-2.5 py-2 text-[11px]"
                    style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-3)" }} />
                    <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                    <span className="shrink-0 font-mono text-[10px]" style={{ color: "var(--text-3)" }}>
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="shrink-0 rounded p-0.5 hover:bg-[var(--surface)]"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" style={{ color: "var(--text-3)" }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
                attachments: damageAttachments,
              });
            }}
            disabled={submittingDamage || !damageDescription.trim()}
            className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{ background: "var(--destructive)", color: "#fff" }}
          >
            {submittingDamage ? "Submitting..." : "Submit Report"}
          </button>
          <button
            onClick={closeModal}
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
