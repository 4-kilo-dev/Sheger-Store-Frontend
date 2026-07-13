import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, RotateCcw, Truck, Wrench } from "lucide-react";
import {
  checkoutReverseApi,
  getBookingSnapshotsApi,
  updateBookingApi,
} from "@/features/bookings/services/bookings.api";
import { Section } from "@/features/bookings/components/shared/Section";
import type { OverviewSectionProps } from "./types";

export function OnsiteDashboard({ b, code, caps }: OverviewSectionProps) {
  const queryClient = useQueryClient();
  const [mealProvision, setMealProvision] = useState((b as any).mealProvision || "");
  const [driverOvertime, setDriverOvertime] = useState((b as any).driverOvertime || "");
  const [isSavingOO, setIsSavingOO] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [reverseReason, setReverseReason] = useState("");
  const [isReversingCheckout, setIsReversingCheckout] = useState(false);

  useEffect(() => {
    setMealProvision((b as any).mealProvision || "");
    setDriverOvertime((b as any).driverOvertime || "");
  }, [b]);

  const { data: checkoutSnapshots = [] } = useQuery({
    queryKey: ["booking-checkout-snapshots", b.id],
    queryFn: () => getBookingSnapshotsApi(b.id, { kind: "CHECKOUT" }),
    enabled:
      !!b.id &&
      (b.status === "ONSITE" ||
        b.status === "COMPLETED" ||
        b.status === "DONE" ||
        b.status === "PARTIALLY_RETURNED"),
  });
  const checkoutSnapshot = checkoutSnapshots?.[0] || null;

  const handleSaveOO = async () => {
    setIsSavingOO(true);
    try {
      await updateBookingApi(b.id, { mealProvision, driverOvertime });
      toast.success("Logistics welfare and overtime saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
    } catch (e: any) {
      toast.error(e.message || "Failed to save logistics info");
    } finally {
      setIsSavingOO(false);
    }
  };

  const handleReverseCheckout = async () => {
    if (reverseReason.trim().length < 10) {
      toast.error("Please provide a reason of at least 10 characters.");
      return;
    }
    setIsReversingCheckout(true);
    try {
      await checkoutReverseApi(b.id, reverseReason.trim());
      toast.success("Checkout reversed. Booking rolled back to PREPARATION.");
      setShowReverseModal(false);
      setReverseReason("");
      queryClient.invalidateQueries({ queryKey: ["booking", code] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to reverse checkout");
    } finally {
      setIsReversingCheckout(false);
    }
  };

  const showWelfare = caps.canEditBooking;
  const showReverse = caps.canReverseCheckout;

  return (
    <>
      <div
        className="rounded-lg border p-4 flex items-center gap-3"
        style={{
          borderColor: "color-mix(in oklab, var(--color-status-onsite) 30%, transparent)",
          background: "color-mix(in oklab, var(--color-status-onsite) 8%, var(--surface))",
        }}
      >
        <div
          className="h-2 w-2 rounded-full animate-ping"
          style={{ background: "var(--color-status-onsite)" }}
        />
        <div className="flex-1">
          <span
            className="text-[12px] font-bold uppercase tracking-wider block"
            style={{ color: "var(--color-status-onsite)" }}
          >
            ONSITE (Active Job)
          </span>
          <span className="text-[11px] text-[var(--text-2)] leading-normal mt-0.5 block">
            Equipment has been checked out from the warehouse and dispatched to the venue. The crew
            is currently executing onsite setup.
          </span>
        </div>
      </div>

      <Section title="Dispatched Equipment (Checked-out Snapshot)" icon={Package}>
        {checkoutSnapshot ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--border)" }}>
                  <th className="label-eyebrow pb-2 text-left">Item Name</th>
                  <th className="label-eyebrow pb-2 text-right w-28">Checked Out Qty</th>
                  <th className="label-eyebrow pb-2 text-right w-24">Type</th>
                </tr>
              </thead>
              <tbody>
                {checkoutSnapshot.lines?.map((line: any) => {
                  const name = line.item?.name || line.pool?.name || "Equipment Item";
                  const isPool = !!line.poolId;
                  return (
                    <tr
                      key={line.id}
                      className="border-b last:border-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <td className="py-2.5 font-medium">{name}</td>
                      <td className="py-2.5 text-right font-mono font-bold">{line.quantity}</td>
                      <td
                        className="py-2.5 text-right text-[10px] uppercase font-bold"
                        style={{ color: "var(--text-3)" }}
                      >
                        {isPool ? "Bulk" : "Serialized"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-center text-[12px]" style={{ color: "var(--text-3)" }}>
            No checkout snapshot found. Gear check-out signature is pending in the warehouse.
          </div>
        )}
      </Section>

      <Section title="Onsite Logistics & Team Brief" icon={Truck}>
        <div className="grid grid-cols-2 gap-4 text-[12px]">
          <div
            className="rounded border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
              Driver & Vehicle
            </div>
            <div className="font-semibold">{b.driver || "No driver assigned"}</div>
            <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--text-2)" }}>
              Plate: {(b as any).vehiclePlate || "—"}
            </div>
          </div>
          <div
            className="rounded border p-3"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-3)] mb-1">
              Onsite Crew
            </div>
            <div className="font-semibold">Lead: {b.teamLeader || "—"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--text-2)" }}>
              {b.stageHand}
            </div>
          </div>
        </div>
      </Section>

      {(showWelfare || showReverse) && (
        <Section title="Field Logistics & Welfare Controls (OO Actions)" icon={Wrench}>
          <div className="space-y-4">
            {showWelfare && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                    Labor Welfare (Meals provided, budget, supplier, allowances)
                    <textarea
                      value={mealProvision}
                      onChange={(e) => setMealProvision(e.target.value)}
                      placeholder="Detail welfare provisions: budget, allowance, meal supplier..."
                      className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-20 block resize-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                  <label className="text-[11px] font-semibold block" style={{ color: "var(--text-2)" }}>
                    Overtime Tracking (Driver night/public holiday hours)
                    <textarea
                      value={driverOvertime}
                      onChange={(e) => setDriverOvertime(e.target.value)}
                      placeholder="Detail overtime: driver hours, night work justifications..."
                      className="mt-1 w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-20 block resize-none"
                      style={{ borderColor: "var(--border)" }}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="flex items-center justify-between">
              {showReverse ? (
                <button
                  onClick={() => setShowReverseModal(true)}
                  className="flex items-center gap-1.5 rounded px-3 py-2 text-[11px] font-bold transition hover:brightness-110 cursor-pointer"
                  style={{
                    background: "color-mix(in oklab, var(--destructive) 15%, transparent)",
                    color: "var(--destructive)",
                    border: "1px solid color-mix(in oklab, var(--destructive) 30%, transparent)",
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reverse Checkout
                </button>
              ) : (
                <div />
              )}
              {showWelfare && (
                <button
                  onClick={handleSaveOO}
                  disabled={isSavingOO}
                  className="rounded px-4 py-2 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  {isSavingOO ? "Saving..." : "Save Field Logs"}
                </button>
              )}
            </div>
          </div>

          {showReverse && showReverseModal && (
            <div
              className="mt-4 rounded-lg border-2 p-4 animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                borderColor: "var(--destructive)",
                background: "color-mix(in oklab, var(--destructive) 6%, var(--surface))",
              }}
            >
              <div className="text-[13px] font-bold mb-1" style={{ color: "var(--destructive)" }}>
                Reverse Checkout — Roll back to PREPARATION
              </div>
              <p className="text-[11px] mb-3" style={{ color: "var(--text-2)" }}>
                This will move the booking from <strong>ONSITE</strong> back to{" "}
                <strong>PREPARATION</strong> and clear inventory movements. All held gear will be
                re-allocated. A reason is required.
              </p>
              <textarea
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="Explain why checkout is being reversed (min. 10 characters)..."
                className="w-full rounded border bg-[var(--surface-2)] p-2.5 text-[12px] h-20 block resize-none mb-3"
                style={{ borderColor: "var(--border)" }}
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowReverseModal(false);
                    setReverseReason("");
                  }}
                  className="rounded border px-3 py-1.5 text-[12px] cursor-pointer"
                  style={{ borderColor: "var(--border)", color: "var(--text-2)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReverseCheckout}
                  disabled={isReversingCheckout || reverseReason.trim().length < 10}
                  className="rounded px-4 py-1.5 text-[12px] font-bold transition hover:brightness-110 disabled:opacity-40 cursor-pointer"
                  style={{ background: "var(--destructive)", color: "#fff" }}
                >
                  {isReversingCheckout ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </div>
          )}
        </Section>
      )}
    </>
  );
}
