import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Paperclip, ShieldAlert, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  getInventoryItemsApi,
  getInventoryPoolsApi,
} from "@/features/inventory/services/inventory.api";
import { getInventoryReportApi } from "@/features/reports/services/reports.api";
import { getBookingsApi, createDamageReportApi } from "@/features/bookings/services/bookings.api";
import { uploadBookingAttachmentFileApi } from "@/features/bookings/services/attachments.api";
import { getDamageReportsApi, resolveDamageReportApi } from "@/features/damage-reports/services/damage.api";
import { usePermissions } from "@/hooks/use-permissions";
import { PERMISSION } from "@/lib/auth/permission-keys";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;

type AssetOption = {
  key: string;
  poolId?: string;
  itemId?: string;
  label: string;
  stockLabel: string;
  availableQuantity: number;
  unit: string;
  isSerialized: boolean;
};

export function DamageReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/damage-report" });
  const { can } = usePermissions();
  const canResolveDamage = can(PERMISSION.DAMAGE_RESOLVE);
  const [submitted, setSubmitted] = useState(false);
  const [assetKey, setAssetKey] = useState("");
  const [bookingCode, setBookingCode] = useState(search.booking || "");
  const [quantity, setQuantity] = useState("1");
  const [reportType, setReportType] = useState<"DAMAGE" | "MISSING">("DAMAGE");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Minor · usable with caution");
  const [discovered, setDiscovered] = useState("Warehouse inspection");
  const [assetPrefillApplied, setAssetPrefillApplied] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [resolutionActions, setResolutionActions] = useState<Record<string, string>>({});
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const fieldClass =
    "mt-1.5 h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-[12px] outline-none focus:border-accent";

  const { data: pools = [], isLoading: poolsLoading } = useQuery({
    queryKey: ["inventory-pools"],
    queryFn: getInventoryPoolsApi,
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: getInventoryItemsApi,
  });

  const { data: inventoryReport = [] } = useQuery({
    queryKey: ["inventory-report"],
    queryFn: getInventoryReportApi,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const { data: reports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["damage-reports"],
    queryFn: getDamageReportsApi,
    enabled: canResolveDamage,
  });

  const assetOptions = useMemo<AssetOption[]>(() => {
    const poolAvailability = new Map<string, number>();
    for (const category of inventoryReport) {
      for (const pool of category.pools || []) {
        if (pool.poolId) poolAvailability.set(pool.poolId, pool.availableQuantity);
      }
    }
    const poolOptions: AssetOption[] = pools.map((p: any) => {
      const total = Number.parseFloat(String(p.totalQuantity ?? "0").replace(/,/g, ""));
      const stock = poolAvailability.get(p.id) ?? total;
      const unit = p.unit || p.category?.unit || "pcs";
      const sku = p.sku ? `${p.sku} · ` : "";
      return {
        key: `pool:${p.id}`,
        poolId: p.id,
        label: `${sku}${p.name}`,
        stockLabel: Number.isFinite(stock) ? `${stock} ${unit}` : `— ${unit}`,
        availableQuantity: Number.isFinite(stock) ? Math.max(0, stock) : 0,
        unit,
        isSerialized: false,
      };
    });

    const itemOptions: AssetOption[] = items.map((i: any) => {
      const tag = i.assetTag || i.serialNumber || i.id.slice(0, 8);
      const cond = i.condition || "AVAILABLE";
      return {
        key: `item:${i.id}`,
        itemId: i.id,
        label: `${tag} · ${i.name}`,
        stockLabel: cond === "AVAILABLE" ? "1 pcs" : `0 · ${cond}`,
        availableQuantity: cond === "AVAILABLE" ? 1 : 0,
        unit: "pcs",
        isSerialized: true,
      };
    });

    return [...poolOptions, ...itemOptions].sort((a, b) => a.label.localeCompare(b.label));
  }, [pools, items, inventoryReport]);

  useEffect(() => {
    if (!assetOptions.length || assetPrefillApplied) return;

    const preferredKey = search.poolId
      ? `pool:${search.poolId}`
      : search.itemId
        ? `item:${search.itemId}`
        : "";

    if (preferredKey && assetOptions.some((o) => o.key === preferredKey)) {
      setAssetKey(preferredKey);
      setAssetPrefillApplied(true);
      return;
    }

    if (!assetKey) {
      setAssetKey(assetOptions[0].key);
      setAssetPrefillApplied(true);
    }
  }, [assetOptions, assetKey, assetPrefillApplied, search.poolId, search.itemId]);

  useEffect(() => {
    if (search.booking) setBookingCode(search.booking);
  }, [search.booking]);

  const selected = assetOptions.find((o) => o.key === assetKey);
  const selectedBooking = bookings.find((booking) => booking.code === bookingCode);

  useEffect(() => {
    if (selected?.isSerialized) setQuantity("1");
  }, [selected?.isSerialized]);

  const enteredQuantity = Number.parseFloat(quantity);
  const quantityExceedsStock =
    !!selected &&
    !selected.isSerialized &&
    Number.isFinite(enteredQuantity) &&
    enteredQuantity > selected.availableQuantity;

  const addAttachments = (files: FileList | null) => {
    if (!files) return;
    setAttachments((current) => {
      const next = [...current];
      for (const file of Array.from(files)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${file.name} exceeds the 20MB limit.`);
          continue;
        }
        if (next.length >= MAX_ATTACHMENTS) {
          toast.error(`Maximum ${MAX_ATTACHMENTS} attachments per damage report.`);
          break;
        }
        if (!next.some((entry) => entry.name === file.name && entry.size === file.size))
          next.push(file);
      }
      return next;
    });
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
  };

  const { mutate: submitReport, isPending } = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select an inventory item");
      if (!description.trim()) throw new Error("Description is required");
      if (attachments.length > 0 && !selectedBooking) {
        throw new Error("Select the related booking before attaching evidence.");
      }

      const qty = selected.isSerialized ? undefined : quantity;
      if (!selected.isSerialized) {
        const n = parseFloat(quantity);
        if (!Number.isFinite(n) || n <= 0)
          throw new Error("Affected quantity must be greater than 0");
        if (n > selected.availableQuantity)
          throw new Error(`Affected quantity cannot exceed available stock (${selected.stockLabel})`);
      }

      const notes = [description.trim(), `Severity: ${severity}`, `Discovered: ${discovered}`].join(
        "\n",
      );

      const report = await createDamageReportApi(selectedBooking?.id || null, {
        reportType,
        poolId: selected.poolId,
        itemId: selected.itemId,
        quantity: qty,
        description: notes,
      });
      if (selectedBooking) {
        await Promise.all(
          attachments.map((file) =>
            uploadBookingAttachmentFileApi(selectedBooking.id, file, {
              relatedEntity: "damage_missing_report",
              relatedId: report.id,
            }),
          ),
        );
      }
      return report;
    },
    onSuccess: () => {
      toast.success("Damage report submitted");
      queryClient.invalidateQueries({ queryKey: ["inventory-pools"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to submit damage report");
    },
  });

  const { mutate: resolveReport, isPending: isResolving } = useMutation({
    mutationFn: ({ id, action, isItem }: { id: string; action: string; isItem: boolean }) =>
      resolveDamageReportApi(id, {
        status: "RESOLVED",
        ...(isItem
          ? { itemCondition: action as "AVAILABLE" | "UNDER_MAINTENANCE" | "DAMAGED" }
          : { resolutionAction: action as "REPAIRED" | "WRITE_OFF" }),
      }),
    onSuccess: () => {
      toast.success("Damage report resolved");
      queryClient.invalidateQueries({ queryKey: ["damage-reports"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-pools"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
    onError: (error: any) => toast.error(error?.message || "Unable to resolve report"),
  });

  const loading = poolsLoading || itemsLoading;

  if (submitted) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border border-border bg-surface px-10 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <CheckCircle2 className="h-6 w-6 text-[var(--color-bom-returned)]" />
          </div>
          <h1 className="mt-4 text-[20px] font-bold">Damage report submitted</h1>
          <p className="mt-2 text-[12px] leading-relaxed text-text-2">
            The affected units are now marked for inspection. The Storekeeper and Chief Technician
            have been notified.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/inventory" })}>
            Return to Inventory
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl">
        <Link
          to="/inventory"
          className="mb-4 flex items-center gap-2 text-[12px] font-semibold text-text-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
        </Link>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="label-eyebrow">Warehouse Incident</div>
            <h1 className="text-[24px] font-bold tracking-tight">Report Equipment Damage</h1>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitReport();
          }}
          className="grid grid-cols-12 gap-4"
        >
          <div className="col-span-8 space-y-4">
            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-4 label-eyebrow">Equipment identification</div>
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2 text-[12px] font-semibold">
                  Related booking{" "}
                  <span className="font-normal" style={{ color: "var(--text-3)" }}>
                    (optional — leave blank for warehouse-only)
                  </span>
                  <select
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value)}
                    className={fieldClass}
                    disabled={bookingsLoading}
                  >
                    <option value="">
                      {bookingsLoading ? "Loading bookings…" : "-- None (warehouse inspection) --"}
                    </option>
                    {bookings.map((b) => (
                      <option key={b.id} value={b.code}>
                        {b.code} · {b.client} · {b.venue}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[12px] font-semibold">
                  Inventory item
                  <select
                    required
                    value={assetKey}
                    onChange={(e) => setAssetKey(e.target.value)}
                    className={fieldClass}
                    disabled={loading || assetOptions.length === 0}
                  >
                    {loading && <option value="">Loading inventory…</option>}
                    {!loading && assetOptions.length === 0 && (
                      <option value="">No inventory found</option>
                    )}
                    {assetOptions.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label} — stock {opt.stockLabel}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-[12px] font-semibold">
                  Affected quantity
                  <input
                    type="number"
                    required={!selected?.isSerialized}
                    min="1"
                    max={selected && !selected.isSerialized ? selected.availableQuantity : undefined}
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    disabled={selected?.isSerialized}
                    className={fieldClass}
                    title={
                      selected?.isSerialized
                        ? "Serialized items are reported as a single unit"
                        : undefined
                    }
                  />
                  {quantityExceedsStock && (
                    <span className="mt-1 block text-[11px] font-normal text-destructive">
                      Only {selected?.stockLabel} is available.
                    </span>
                  )}
                </label>

                <label className="text-[12px] font-semibold">
                  Report type
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as "DAMAGE" | "MISSING")}
                    className={fieldClass}
                  >
                    <option value="DAMAGE">Damage</option>
                    <option value="MISSING">Missing</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-1 label-eyebrow">Evidence attachments</div>
              <p className="mb-3 text-[11px] text-text-2">
                {selectedBooking
                  ? "Attach photos or documents to the related booking."
                  : "Select a related booking before attaching evidence files."}
              </p>
              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf,.pdf,.zip"
                className="hidden"
                onChange={(event) => addAttachments(event.target.files)}
              />
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={!selectedBooking || attachments.length >= MAX_ATTACHMENTS || isPending}
                title={!selectedBooking ? "Select a related booking first" : undefined}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-[12px] font-semibold text-text-2 hover:border-accent disabled:opacity-50"
              >
                <Paperclip className="h-4 w-4" />
                {selectedBooking ? "Add photos or documents" : "Select a booking to attach files"}
              </button>
              {attachments.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${file.size}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2 text-[11px]"
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0 text-text-3" />
                      <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                      <span className="text-text-3">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                      <button
                        type="button"
                        aria-label={`Remove ${file.name}`}
                        onClick={() =>
                          setAttachments((current) => current.filter((_, i) => i !== index))
                        }
                        className="p-0.5 text-text-3 hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-border bg-surface p-5">
              <div className="mb-4 label-eyebrow">Incident details</div>
              <div className="grid grid-cols-2 gap-4">
                <label className="text-[12px] font-semibold">
                  Damage severity
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className={fieldClass}
                  >
                    <option>Minor · usable with caution</option>
                    <option>Major · remove from service</option>
                    <option>Critical · safety hazard</option>
                  </select>
                </label>
                <label className="text-[12px] font-semibold">
                  Where discovered?
                  <select
                    value={discovered}
                    onChange={(e) => setDiscovered(e.target.value)}
                    className={fieldClass}
                  >
                    <option>Warehouse inspection</option>
                    <option>Venue / onsite</option>
                    <option>During transport</option>
                    <option>On return</option>
                  </select>
                </label>
                <label className="col-span-2 text-[12px] font-semibold">
                  Description
                  <textarea
                    required
                    rows={5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe visible damage, symptoms, and circumstances…"
                    className="mt-1.5 w-full rounded-md border border-border bg-surface-2 p-3 text-[12px] outline-none focus:border-accent"
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="col-span-4">
            <div className="sticky top-20 rounded-lg border border-border bg-surface p-5">
              <div className="flex items-center gap-2 text-[12px] font-bold">
                <AlertTriangle className="h-4 w-4 text-[var(--color-pay-advance)]" /> Submission
                impact
              </div>
              <ul className="mt-4 space-y-3 text-[11px] leading-relaxed text-text-2">
                <li>• Units will be placed on inspection hold.</li>
                <li>• Available stock will update immediately.</li>
                <li>• Storekeeper and Chief Technician will be notified.</li>
                <li>• A repair task will be opened for major damage.</li>
              </ul>
              {selected && (
                <div className="mt-4 rounded-md border border-border bg-surface-2 p-3 text-[11px]">
                  <div className="font-semibold">{selected.label}</div>
                  <div className="mt-1 text-text-2">Stock: {selected.stockLabel}</div>
                </div>
              )}
              <div className="mt-5 border-t border-border pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isPending || loading || quantityExceedsStock}
                >
                  <ShieldAlert /> {isPending ? "Submitting…" : "Submit Damage Report"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-2 w-full"
                  onClick={() => navigate({ to: "/inventory" })}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </aside>
        </form>
        {canResolveDamage && (
          <section className="mt-6 overflow-hidden rounded-lg border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div>
                <div className="label-eyebrow">Incident Queue</div>
                <h2 className="mt-1 text-[15px] font-bold">Damage & Missing Reports</h2>
              </div>
              <span className="text-[11px] text-text-2">{reports.filter((report) => report.status !== "RESOLVED" && report.status !== "REJECTED").length} open</span>
            </div>
            {reportsLoading ? (
              <p className="px-5 py-8 text-center text-[12px] text-text-3">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="px-5 py-8 text-center text-[12px] text-text-3">No damage or missing reports recorded.</p>
            ) : (
              <div className="divide-y divide-border">
                {reports.map((report) => {
                  const isItem = !!report.itemId;
                  const action = resolutionActions[report.id] || (isItem ? "AVAILABLE" : "REPAIRED");
                  const isOpen = report.status === "OPEN" || report.status === "UNDER_REVIEW";
                  return (
                    <div key={report.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-[12px]">
                      <div className="min-w-[220px] flex-1">
                        <div className="font-semibold">{report.itemName || report.poolName || "Unknown inventory item"}</div>
                        <div className="mt-0.5 text-[11px] text-text-2">
                          {report.reportType === "MISSING" ? "Missing" : "Damaged"}
                          {report.quantity ? ` · ${report.quantity}` : " · 1 unit"}
                          {report.bookingCode ? ` · ${report.bookingCode}` : " · Warehouse"}
                        </div>
                      </div>
                      <span className={report.reportType === "MISSING" ? "text-destructive" : "text-[var(--color-pay-advance)]"}>{report.reportType}</span>
                      <span className="text-text-2">{report.status.replaceAll("_", " ")}</span>
                      {isOpen && (
                        <>
                          <select
                            value={action}
                            onChange={(event) => setResolutionActions((current) => ({ ...current, [report.id]: event.target.value }))}
                            className="h-8 rounded border border-border bg-surface-2 px-2 text-[11px]"
                          >
                            {isItem ? (
                              <>
                                <option value="AVAILABLE">Return to available</option>
                                <option value="UNDER_MAINTENANCE">Send to maintenance</option>
                                <option value="DAMAGED">Keep out of service</option>
                              </>
                            ) : (
                              <>
                                <option value="REPAIRED">Repaired / return to stock</option>
                                <option value="WRITE_OFF">Write off inventory</option>
                              </>
                            )}
                          </select>
                          <Button size="sm" disabled={isResolving} onClick={() => resolveReport({ id: report.id, action, isItem })}>
                            Resolve
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
}
