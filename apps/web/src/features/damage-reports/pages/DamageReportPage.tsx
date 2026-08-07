import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  getInventoryItemsApi,
  getInventoryPoolsApi,
} from "@/features/inventory/services/inventory.api";
import { getBookingsApi, createDamageReportApi } from "@/features/bookings/services/bookings.api";

type AssetOption = {
  key: string;
  poolId?: string;
  itemId?: string;
  label: string;
  stockLabel: string;
  unit: string;
  isSerialized: boolean;
};

export function DamageReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/damage-report" });
  const [submitted, setSubmitted] = useState(false);
  const [assetKey, setAssetKey] = useState("");
  const [bookingCode, setBookingCode] = useState(search.booking || "");
  const [quantity, setQuantity] = useState("1");
  const [reportType, setReportType] = useState<"DAMAGE" | "MISSING">("DAMAGE");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Minor · usable with caution");
  const [discovered, setDiscovered] = useState("Warehouse inspection");
  const [assetPrefillApplied, setAssetPrefillApplied] = useState(false);

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

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  const assetOptions = useMemo<AssetOption[]>(() => {
    const poolOptions: AssetOption[] = pools.map((p: any) => {
      const stock = Number.parseFloat(String(p.totalQuantity ?? "0").replace(/,/g, ""));
      const unit = p.unit || p.category?.unit || "pcs";
      const sku = p.sku ? `${p.sku} · ` : "";
      return {
        key: `pool:${p.id}`,
        poolId: p.id,
        label: `${sku}${p.name}`,
        stockLabel: Number.isFinite(stock) ? `${stock} ${unit}` : `— ${unit}`,
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
        unit: "pcs",
        isSerialized: true,
      };
    });

    return [...poolOptions, ...itemOptions].sort((a, b) => a.label.localeCompare(b.label));
  }, [pools, items]);

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

  const { mutate: submitReport, isPending } = useMutation({
    mutationFn: async () => {
      if (!bookingCode) throw new Error("Select the related booking");
      if (!selected) throw new Error("Select an inventory item");
      if (!description.trim()) throw new Error("Description is required");

      const qty = selected.isSerialized ? undefined : quantity;
      if (!selected.isSerialized) {
        const n = parseFloat(quantity);
        if (!Number.isFinite(n) || n <= 0) throw new Error("Affected quantity must be greater than 0");
      }

      const notes = [
        description.trim(),
        `Severity: ${severity}`,
        `Discovered: ${discovered}`,
      ].join("\n");

      return createDamageReportApi(bookingCode, {
        reportType,
        poolId: selected.poolId,
        itemId: selected.itemId,
        quantity: qty,
        description: notes,
      });
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
                  Related booking
                  <select
                    required
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value)}
                    className={fieldClass}
                    disabled={bookingsLoading}
                  >
                    <option value="">
                      {bookingsLoading ? "Loading bookings…" : "-- Select booking --"}
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
                <Button type="submit" className="w-full" disabled={isPending || loading}>
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
      </div>
    </AppShell>
  );
}
