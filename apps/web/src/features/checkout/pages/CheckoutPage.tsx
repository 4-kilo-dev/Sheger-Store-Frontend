import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Check, CheckCircle2, ChevronDown, ClipboardCheck,
  Package, PackageCheck, Printer, Search, Truck, X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { getBookingsApi, type Booking, type BomItem } from "@/features/bookings/services/bookings.api";
import { getBookingBomLinesApi, checkoutBookingApi, checkinBookingApi } from "@/features/checkout/services/operations.api";
import { useAuthUser } from "@/hooks/use-auth-user";

const _Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Check-In / Out · Vortex Visual" },
      { name: "description", content: "Material check-out and check-in register for LED rental bookings." },
    ],
  }),
  component: CheckoutPage,
});

type Mode = "checkout" | "checkin";

export function CheckoutPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthUser();
  const userRole = authUser?.role?.toLowerCase() || "";
  const [mode, setMode] = useState<Mode>("checkout");
  const [selectedCode, setSelectedCode] = useState("");
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  // Fetch bookings list
  const { data: bookingsList = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: getBookingsApi,
  });

  // Fetch BOM lines for the selected booking
  const { data: backendBomLines = [] } = useQuery({
    queryKey: ["bomLines", selectedCode],
    queryFn: () => getBookingBomLinesApi(selectedCode),
    enabled: !!selectedCode,
  });

  const eligibleBookings = useMemo(() => {
    if (mode === "checkout") {
      return bookingsList.filter((b) => b.status === "PREPARATION" || b.status === "ACCEPTED" || b.status === "RESERVED" || b.status === "CONFIRMED");
    }
    return bookingsList.filter((b) => b.status === "COMPLETED" || b.status === "ONSITE");
  }, [mode, bookingsList]);

  const selected = eligibleBookings.find((b) => b.code === selectedCode);

  const toggleItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!selected) return;
    if (checkedItems.size === selected.bomItems.length) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(selected.bomItems.map((i) => i.id)));
    }
  };

  const { mutate: performOperation, isPending } = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      if (mode === "checkout") {
        const assets = selected.bomItems.map((item) => {
          const matchedLine = backendBomLines.find(
            (line) => line.id === item.id || line.item?.name === item.name || line.pool?.name === item.name
          );
          return {
            poolId: matchedLine?.poolId || null,
            itemId: matchedLine?.itemId || null,
            quantity: String(item.qty),
          };
        });
        await checkoutBookingApi(selected.code, { assets });
      } else {
        const returns = selected.bomItems.map((item) => {
          const matchedLine = backendBomLines.find(
            (line) => line.id === item.id || line.item?.name === item.name || line.pool?.name === item.name
          );
          return {
            poolId: matchedLine?.poolId || null,
            itemId: matchedLine?.itemId || null,
            quantityReturned: String(item.qty),
            condition: "AVAILABLE",
          };
        });
        await checkinBookingApi(selected.code, { returns });
      }
    },
    onSuccess: () => {
      toast.success(mode === "checkout" ? "Check-out completed successfully!" : "Check-in completed successfully!");
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", selectedCode] });
      setSubmitted(true);
    },
    onError: (err: any) => {
      toast.error(err.message || "Operation failed");
    },
  });

  const handleSubmit = () => {
    performOperation();
  };

  const reset = () => {
    setSelectedCode("");
    setCheckedItems(new Set());
    setSubmitted(false);
  };

  if (submitted && selected) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-lg border px-10 py-14 text-center" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--color-bom-returned) 20%, transparent)" }}>
            <CheckCircle2 className="h-7 w-7" style={{ color: "var(--color-bom-returned)" }} />
          </div>
          <h1 className="mt-4 text-[20px] font-bold">
            {mode === "checkout" ? "Material Check-Out Completed" : "Material Check-In Completed"}
          </h1>
          <p className="mt-2 text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
            {checkedItems.size} items {mode === "checkout" ? "checked out" : "checked in"} for booking <strong style={{ color: "var(--accent)" }}>{selected.code}</strong>.
            {mode === "checkout"
              ? " Materials are now marked as 'Out' with timestamp. The booking status has been advanced to ONSITE."
              : " All items have been verified and returned to warehouse. The booking status has been marked as DONE."}
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={reset}
              className="rounded-md px-5 py-2 text-[12px] font-semibold"
              style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
            >
              Process Another
            </button>
            <Link
              to="/bookings/$code"
              params={{ code: selected.code }}
              className="rounded-md border px-5 py-2 text-[12px] font-semibold"
              style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
            >
              View Booking
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="label-eyebrow">Warehouse Operations</div>
            <h1 className="text-[24px] font-bold tracking-tight">Material Check-In / Check-Out</h1>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => { setMode("checkout"); setSelectedCode(""); setCheckedItems(new Set()); }}
            className="flex items-center gap-3 rounded-lg border p-4 transition"
            style={{
              borderColor: mode === "checkout" ? "var(--accent)" : "var(--border)",
              background: mode === "checkout" ? "color-mix(in oklab, var(--accent) 8%, var(--surface))" : "var(--surface)",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                background: mode === "checkout" ? "var(--accent)" : "var(--surface-2)",
                color: mode === "checkout" ? "var(--accent-foreground)" : "var(--text-2)",
              }}
            >
              <Truck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[13px] font-bold">Check-Out</div>
              <div className="text-[10px]" style={{ color: "var(--text-2)" }}>Materials leaving warehouse for a job</div>
            </div>
          </button>
          <button
            onClick={() => { setMode("checkin"); setSelectedCode(""); setCheckedItems(new Set()); }}
            className="flex items-center gap-3 rounded-lg border p-4 transition"
            style={{
              borderColor: mode === "checkin" ? "var(--color-bom-returned)" : "var(--border)",
              background: mode === "checkin" ? "color-mix(in oklab, var(--color-bom-returned) 8%, var(--surface))" : "var(--surface)",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{
                background: mode === "checkin" ? "var(--color-bom-returned)" : "var(--surface-2)",
                color: mode === "checkin" ? "#fff" : "var(--text-2)",
              }}
            >
              <PackageCheck className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[13px] font-bold">Check-In</div>
              <div className="text-[10px]" style={{ color: "var(--text-2)" }}>Materials returning from a completed job</div>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Main */}
          <div className="col-span-8 space-y-4">
            {/* Booking selector */}
            <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="label-eyebrow mb-3">Select Booking</div>
              <select
                value={selectedCode}
                onChange={(e) => { setSelectedCode(e.target.value); setCheckedItems(new Set()); }}
                className="h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[13px] outline-none focus:border-[var(--accent)]"
                style={{ borderColor: "var(--border)" }}
              >
                <option value="">— Select a booking —</option>
                {eligibleBookings.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} · {b.client} · {b.venue} · {b.eventDate}
                  </option>
                ))}
              </select>
              {eligibleBookings.length === 0 && (
                <p className="mt-2 text-[11px]" style={{ color: "var(--text-3)" }}>
                  No bookings eligible for {mode === "checkout" ? "check-out" : "check-in"} at this time.
                </p>
              )}
            </div>

            {/* BOM checklist */}
            {selected && (
              <div className="rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                    <span className="label-eyebrow">Bill of Materials — Verify Each Item</span>
                  </div>
                  <button onClick={toggleAll} className="text-[11px] font-semibold" style={{ color: "var(--accent)" }}>
                    {checkedItems.size === selected.bomItems.length ? "Uncheck All" : "Check All"}
                  </button>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {selected.bomItems.map((item) => {
                    const checked = checkedItems.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 px-4 py-3 transition hover:bg-[var(--surface-2)] cursor-pointer"
                        onClick={() => toggleItem(item.id)}
                        style={{ opacity: checked ? 1 : 0.7 }}
                      >
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition"
                          style={{
                            borderColor: checked ? (mode === "checkout" ? "var(--accent)" : "var(--color-bom-returned)") : "var(--border)",
                            background: checked ? (mode === "checkout" ? "var(--accent)" : "var(--color-bom-returned)") : "transparent",
                          }}
                        >
                          {checked && <Check className="h-3.5 w-3.5" style={{ color: mode === "checkout" ? "var(--accent-foreground)" : "#fff" }} />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-bold" style={{ color: "var(--accent)" }}>{item.id}</span>
                            <span className="text-[12px] font-medium">{item.name}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[14px] font-bold">{item.qty}</div>
                          <div className="text-[9px] uppercase" style={{ color: "var(--text-3)" }}>units</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: "var(--border)" }}>
                  <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                    {checkedItems.size} of {selected.bomItems.length} items verified
                  </span>
                  <div className="h-1.5 w-32 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(checkedItems.size / selected.bomItems.length) * 100}%`,
                        background: mode === "checkout" ? "var(--accent)" : "var(--color-bom-returned)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Responsible party */}
            {selected && (
              <div className="rounded-lg border p-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="label-eyebrow mb-3">Responsible Party</div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-[12px] font-semibold">
                    {mode === "checkout" ? "Checked out by" : "Received by"}
                    <input
                      defaultValue="Selam Worku"
                      className="mt-1.5 h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[12px] outline-none focus:border-[var(--accent)]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label className="text-[12px] font-semibold">
                    Timestamp
                    <input
                      type="datetime-local"
                      defaultValue={new Date().toISOString().slice(0, 16)}
                      className="mt-1.5 h-10 w-full rounded-md border bg-[var(--surface-2)] px-3 text-[12px] font-mono outline-none focus:border-[var(--accent)]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                </div>
                {mode === "checkin" && (
                  <label className="mt-4 block text-[12px] font-semibold">
                    Return Notes
                    <textarea
                      rows={3}
                      placeholder="Note any missing or damaged items…"
                      className="mt-1.5 w-full rounded-md border bg-[var(--surface-2)] p-3 text-[12px] outline-none focus:border-[var(--accent)]"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="col-span-4">
            <div className="sticky top-20 space-y-4">
              {selected && (
                <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="label-eyebrow mb-3">Booking Summary</div>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>Code</span>
                      <span className="font-mono font-bold" style={{ color: "var(--accent)" }}>{selected.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>Client</span>
                      <span className="font-semibold">{selected.client}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>Venue</span>
                      <span>{selected.venue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>Event</span>
                      <span className="font-mono">{selected.eventDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>Status</span>
                      <StatusBadge status={selected.status} />
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>BOM Items</span>
                      <span className="font-mono font-bold">{selected.bomItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-3)" }}>Total Units</span>
                      <span className="font-mono font-bold">{selected.bomItems.reduce((s, i) => s + i.qty, 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-lg border p-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                <div className="flex items-center gap-2 text-[12px] font-bold">
                  <ClipboardCheck className="h-4 w-4" style={{ color: "var(--accent)" }} />
                  {mode === "checkout" ? "Check-Out Process" : "Check-In Process"}
                </div>
                <ul className="mt-3 space-y-2 text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                  <li>1. Select the booking to process</li>
                  <li>2. Count and verify each BOM item</li>
                  <li>3. Check off each verified item</li>
                  <li>4. Enter responsible party</li>
                  <li>5. Submit to register {mode === "checkout" ? "materials out" : "materials returned"}</li>
                </ul>
              </div>

              {selected && (
                <div className="space-y-2">
                  {mode === "checkin" && selected.status === "ONSITE" && userRole === "storekeeper" && (
                    <div className="rounded-lg border p-3.5 text-[12px] font-semibold leading-relaxed" style={{ borderColor: "var(--color-status-onsite)", background: "color-mix(in oklab, var(--color-status-onsite) 10%, var(--surface))", color: "var(--color-status-onsite)" }}>
                      Gear is on-site. Awaiting event completion and warehouse return.
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={
                      checkedItems.size === 0 || 
                      isPending || 
                      (mode === "checkin" && selected.status === "ONSITE" && userRole === "storekeeper")
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-md py-3 text-[13px] font-bold transition hover:brightness-110 disabled:opacity-40"
                    style={{
                      background: mode === "checkout" ? "var(--accent)" : "var(--color-bom-returned)",
                      color: mode === "checkout" ? "var(--accent-foreground)" : "#fff",
                    }}
                  >
                    {mode === "checkout" ? <Truck className="h-4 w-4" /> : <PackageCheck className="h-4 w-4" />}
                    {isPending ? "Processing..." : (mode === "checkout" ? "Confirm Check-Out" : "Confirm Check-In")}
                  </button>
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-md border py-2.5 text-[12px] font-semibold transition hover:border-[var(--accent)]"
                    style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                  >
                    <Printer className="h-3.5 w-3.5" /> Print Packing Slip
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
